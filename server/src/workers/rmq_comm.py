import time
import json
import pika
import socket
from pika.exceptions import ConnectionClosed
from multiprocessing.pool import ThreadPool
from threading import Event
from threading import Thread
import logging
import sys


threads = []


class AsyncConsumer(object):
    """This is an example consumer that will handle unexpected interactions
    with RabbitMQ such as channel and connection closures.

    If RabbitMQ closes the connection, it will reopen it. You should
    look at the output, as there are limited reasons why the connection may
    be closed, which usually are tied to permission related issues or
    socket timeouts.

    If the channel is closed, it will indicate a problem with one of the
    commands that were issued and that should surface in the output as well.

    """

    def __init__(self, amqp_url, logger, params):
        """Create a new instance of the consumer class, passing in the AMQP
        URL used to connect to RabbitMQ.

        :param str amqp_url: The AMQP url to connect with
        :param dict params: implementation specific params

        """
        self._connection = None
        self._channel = None
        self._closing = False
        self._consumer_tag = None
        self._logger = logger
        self._url = amqp_url
        self._fn_on_exchange_declared = None
        self._basic_publish_connection = None
        self._basic_publish_channel = None
        self._wait_exception = None
        self._actively_consuming = False
        self._fn_on_channel_open = None
        self._launch_message_handler_pool = ThreadPool()

        start_keep_connection_alive_thread = Thread(target=self.call_process_data_events)
        start_keep_connection_alive_thread.start()

        if 'exch' in params:
            self._exchange = params['exch']
        if 'exch_type' in params:
            self._exchange_type = params['exch_type']
        if 'durable' in params:
            self._durable = params['durable']
        if 'queue_name' in params:
            self._queue_name = params['queue_name']
        if 'exclusive' in params:
            self._exclusive = params['exclusive']
        if 'auto_delete' in params:
            self._auto_delete = params['auto_delete']
        if 'routing_key' in params:
            self._routing_key = params['routing_key']
        if 'prefetch_count' in params:
            self._prefetch_count = params['prefetch_count']
        if 'no_ack' in params:
            self._no_ack = params['no_ack']
        if 'on_message' in params:
            self._fn_on_message = params['on_message']
        if 'on_channel_opened' in params:
            self._fn_on_channel_open = params['on_channel_opened']
        if 'exception_event' in params:
            self._wait_exception = params['exception_event']
        if 'on_exchange_declared' in params:
            self._fn_on_exchange_declared = params['on_exchange_declared']

    def connect(self):
        """This method connects to RabbitMQ, returning the connection handle.
        When the connection is established, the on_connection_open method
        will be invoked by pika.

        :rtype: pika.SelectConnection

        """
        self._logger.debug(json.dumps({"msg": "Connecting to {0}".format(self._url)}))
        return pika.SelectConnection(pika.URLParameters(self._url),
                                     self.on_connection_open,
                                     stop_ioloop_on_close=False)

    def on_connection_open(self, unused_connection):
        """This method is called by pika once the connection to RabbitMQ has
        been established. It passes the handle to the connection object in
        case we need it, but in this case, we'll just mark it unused.

        :type unused_connection: pika.SelectConnection

        """
        self._logger.debug(json.dumps({"msg": "Connection opened"}))
        self.add_on_connection_close_callback()
        self.open_channel()

    def add_on_connection_close_callback(self):
        """This method adds an on close callback that will be invoked by pika
        when RabbitMQ closes the connection to the publisher unexpectedly.

        """
        self._logger.debug(json.dumps({"msg": "Adding connection close callback"}))
        self._connection.add_on_close_callback(self.on_connection_closed)

    def on_connection_closed(self, connection, reply_code, reply_text):
        """This method is invoked by pika when the connection to RabbitMQ is
        closed unexpectedly. Since it is unexpected, we will reconnect to
        RabbitMQ if it disconnects.

        :param pika.connection.Connection connection: The closed connection obj
        :param int reply_code: The server provided reply_code if given
        :param str reply_text: The server provided reply_text if given

        """
        self._channel = None
        if self._closing:
            self._connection.ioloop.stop()
        else:
            self._logger.warning(json.dumps({"msg": "Connection closed, reopening in 5 seconds", "reply_code": reply_code, "reply_text": reply_text}))
            self._connection.add_timeout(5, self.reconnect)

    def reconnect(self):
        """Will be invoked by the IOLoop timer if the connection is
        closed. See the on_connection_closed method.

        """
        # This is the old connection IOLoop instance, stop its ioloop
        self._connection.ioloop.stop()

        if not self._closing:

            # Create a new connection
            self._connection = self.connect()

            # There is now a new connection, needs a new ioloop to run
            self._connection.ioloop.start()

    def open_channel(self):
        """Open a new channel with RabbitMQ by issuing the Channel.Open RPC
        command. When RabbitMQ responds that the channel is open, the
        on_channel_open callback will be invoked by pika.

        """
        self._logger.debug(json.dumps({"msg": "Creating a new channel"}))
        self._connection.channel(on_open_callback=self.on_channel_open)

    def on_channel_open(self, channel):
        """This method is invoked by pika when the channel has been opened.
        The channel object is passed in so we can make use of it.

        Since the channel is now open, we'll declare the exchange to use.

        :param pika.channel.Channel channel: The channel object

        """
        self._logger.debug(json.dumps({"msg": "Channel opened"}))
        self._channel = channel
        self.add_on_channel_close_callback()
        if self._exchange != '':
            self.setup_exchange(self._exchange)
        else:
            self.setup_queue(self._queue_name)
        if self._fn_on_channel_open is not None:
            self._fn_on_channel_open()

    def add_on_channel_close_callback(self):
        """This method tells pika to call the on_channel_closed method if
        RabbitMQ unexpectedly closes the channel.

        """
        self._logger.debug(json.dumps({"msg": "Adding channel close callback"}))
        self._channel.add_on_close_callback(self.on_channel_closed)

    def on_channel_closed(self, channel, reply_code, reply_text):
        """Invoked by pika when RabbitMQ unexpectedly closes the channel.
        Channels are usually closed if you attempt to do something that
        violates the protocol, such as re-declare an exchange or queue with
        different parameters. In this case, we'll close the connection
        to shutdown the object.

        :param pika.channel.Channel: The closed channel
        :param int reply_code: The numeric reason the channel was closed
        :param str reply_text: The text reason the channel was closed

        """
        self._logger.info(json.dumps({"msg": "Channel was closed", "channel": str(channel), "reply_code": reply_code, "reply_text": reply_text}))
        self._connection.close()

    def setup_exchange(self, exchange_name):
        """Setup the exchange on RabbitMQ by invoking the Exchange.Declare RPC
        command. When it is complete, the on_exchange_declareok method will
        be invoked by pika.

        :param str|unicode exchange_name: The name of the exchange to declare

        """
        self._logger.info(json.dumps({"msg": "Declaring exchange", "exchange_type": self._exchange_type, "exchange_name": exchange_name}))
        print('before exchange_declare')
        self._channel.exchange_declare(self.on_exchange_declareok, exchange_name, self._exchange_type, self._durable)
        print('after exchange_declare')

    def on_exchange_declareok(self, unused_frame):
        """Invoked by pika when RabbitMQ has finished the Exchange.Declare RPC
        command.

        :param pika.Frame.Method unused_frame: Exchange.DeclareOk response frame

        """
        self._logger.debug(json.dumps({"msg": "Exchange declared"}))
        if self._fn_on_exchange_declared is not None:
            self._fn_on_exchange_declared()
        self.setup_queue(self._queue_name)

    def setup_queue(self, queue_name):
        """Setup the queue on RabbitMQ by invoking the Queue.Declare RPC
        command. When it is complete, the on_queue_declareok method will
        be invoked by pika.

        :param str|unicode queue_name: The name of the queue to declare.

        """
        self._logger.info(json.dumps({"msg": "Declaring queue", "queue_name": queue_name}))
        self._channel.queue_declare(self.on_queue_declareok,
                                    queue=queue_name,
                                    durable=self._durable,
                                    exclusive=self._exclusive,
                                    auto_delete=self._auto_delete)

    def on_queue_declareok(self, method_frame):
        """Method invoked by pika when the Queue.Declare RPC call made in
        setup_queue has completed. In this method we will bind the queue
        and exchange together with the routing key by issuing the Queue.Bind
        RPC command. When this command is complete, the on_bindok method will
        be invoked by pika.

        :param pika.frame.Method method_frame: The Queue.DeclareOk frame

        """
        if self._routing_key is not None:
            if self._exchange != '':
                self._logger.info(json.dumps({"msg": "Binding queue to exchange", "exchange": self._exchange, "queue_name": self._queue_name, "routing_key": self._routing_key}))
                self._channel.queue_bind(self.on_bindok, self._queue_name, self._exchange, self._routing_key)
        else:
            self._logger.debug(json.dumps({"msg": "Queue declared"}))
            self.start_consuming()

    def on_bindok(self, unused_frame):
        """Invoked by pika when the Queue.Bind method has completed. At this
        point we will start consuming messages by calling start_consuming
        which will invoke the needed RPC commands to start the process.

        :param pika.frame.Method unused_frame: The Queue.BindOk response frame

        """
        self._logger.debug(json.dumps({"msg": "Queue bound"}))
        self.start_consuming()

    def start_consuming(self):
        """This method sets up the consumer by first calling
        add_on_cancel_callback so that the object is notified if RabbitMQ
        cancels the consumer. It then issues the Basic.Consume RPC command
        which returns the consumer tag that is used to uniquely identify the
        consumer with RabbitMQ. We keep the value to use it when we want to
        cancel consuming. The on_message method is passed in as a callback pika
        will invoke when a message is fully received.

        """
        self._logger.debug(json.dumps({"msg": "Issuing consumer related RPC commands"}))
        self.add_on_cancel_callback()
        if self._prefetch_count != 0:
            self._channel.basic_qos(prefetch_count=self._prefetch_count)
        self._consumer_tag = self._channel.basic_consume(self.on_message, self._queue_name, no_ack=self._no_ack)
        self._actively_consuming = True

    def add_on_cancel_callback(self):
        """Add a callback that will be invoked if RabbitMQ cancels the consumer
        for some reason. If RabbitMQ does cancel the consumer,
        on_consumer_cancelled will be invoked by pika.

        """
        self._logger.debug(json.dumps({"msg": "Adding consumer cancellation callback"}))
        self._channel.add_on_cancel_callback(self.on_consumer_cancelled)

    def on_consumer_cancelled(self, method_frame):
        """Invoked by pika when RabbitMQ sends a Basic.Cancel for a consumer
        receiving messages.

        :param pika.frame.Method method_frame: The Basic.Cancel frame

        """
        self._logger.warning(json.dumps({"msg": "Consumer was cancelled remotely, shutting down", "method_frame": method_frame}))
        if self._channel:
            self._channel.close()

    def on_message(self, unused_channel, basic_deliver, properties, body):
        """Invoked by pika when a message is delivered from RabbitMQ. The
        channel is passed for your convenience. The basic_deliver object that
        is passed in carries the exchange, routing key, delivery tag and
        a redelivered flag for the message. The properties passed in is an
        instance of BasicProperties with the message properties and the body
        is the message that was sent.

        :param pika.channel.Channel unused_channel: The channel object
        :param pika.Spec.Basic.Deliver: basic_deliver method
        :param pika.Spec.BasicProperties: properties
        :param str|unicode body: The message body

        """
        # self._logger.info("Received message # {0} from {1}: {2}".format(basic_deliver.delivery_tag, properties.app_id, body)))
        self._launch_message_handler_pool.apply_async(self._fn_on_message, args=(basic_deliver.delivery_tag, body, self), callback=self.on_message_callback)
        # self._fn_on_message(basic_deliver.delivery_tag, body, self)
        # self.acknowledge_message(basic_deliver.delivery_tag)

    def on_message_callback(self, res):
        if res == 'FAILURE':
            if self._wait_exception:
                self._wait_exception.set()

    def acknowledge_message(self, delivery_tag):
        """Acknowledge the message delivery from RabbitMQ by sending a
        Basic.Ack RPC method for the delivery tag.

        :param int delivery_tag: The delivery tag from the Basic.Deliver frame

        """
        # self._logger.debug("Acknowledging message {0}".format(delivery_tag)))
        self._channel.basic_ack(delivery_tag)

    def reject_message(self, delivery_tag):
        """Acknowledge the message delivery from RabbitMQ by sending a
        Basic.Ack RPC method for the delivery tag.

        :param int delivery_tag: The delivery tag from the Basic.Deliver frame

        """
        # self._logger.info("Rejecting message {0}".format(delivery_tag)))
        self._channel.basic_reject(delivery_tag)

    def stop_consuming(self):
        """Tell RabbitMQ that you would like to stop consuming by sending the
        Basic.Cancel RPC command.

        """
        if self._channel:
            self._logger.info(json.dumps({"msg": "Sending a Basic.Cancel RPC command to RabbitMQ"}))
            self._channel.basic_cancel(self.on_cancelok, self._consumer_tag)

    def on_cancelok(self, unused_frame):
        """This method is invoked by pika when RabbitMQ acknowledges the
        cancellation of a consumer. At this point we will close the channel.
        This will invoke the on_channel_closed method once the channel has been
        closed, which will in-turn close the connection.

        :param pika.frame.Method unused_frame: The Basic.CancelOk frame

        """
        self._actively_consuming = False
        self._logger.debug(json.dumps({"msg": "RabbitMQ acknowledged the cancellation of the consumer"}))

    def close_channel(self):
        """Call to close the channel with RabbitMQ cleanly by issuing the
        Channel.Close RPC command.

        """
        self._logger.info(json.dumps({"msg": "Closing the RMQ channel"}))
        self._channel.close()
        if self._basic_publish_channel:
            try:
                self._basic_publish_channel.basic_cancel(None)
                self._basic_publish_channel.close()
            except ConnectionClosed:
                pass

    def open_connection(self):
        """Connect to RabbitMQ
        """
        self._connection = self.connect()

    def run(self):
        """Run the example consumer by connecting to RabbitMQ and then
        starting the IOLoop to block and allow the SelectConnection to operate.

        """
        try:
            while self._connection is None:
                self.open_connection()
            self._connection.ioloop.start()
        except KeyboardInterrupt:
            self.stop()
            raise

    def stop(self):
        """Cleanly shutdown the connection to RabbitMQ by stopping the consumer
        with RabbitMQ. When RabbitMQ confirms the cancellation, on_cancelok
        will be invoked by pika, which will then closing the channel and
        connection. The IOLoop is started again because this method is invoked
        when CTRL-C is pressed raising a KeyboardInterrupt exception. This
        exception stops the IOLoop which needs to be running for pika to
        communicate with RabbitMQ. All of the commands issued prior to starting
        the IOLoop will be buffered but not processed.

        """
        self._logger.debug(json.dumps({"msg": "RMQ stopping"}))
        self._closing = True
        self.stop_consuming()
        while self._actively_consuming:
            time.sleep(.1)
        self.close_channel()
        self._connection.ioloop.start()
        self.close_connection()
        self._logger.debug(json.dumps({"msg": "RMQ stopped"}))

    def close_connection(self):
        """This method closes the connection to RabbitMQ."""
        self._logger.info(json.dumps({"msg": "Closing RMQ connection"}))
        self._connection.close()
        if self._basic_publish_connection:
            self._basic_publish_connection.close()

    def create_basic_publish_channel(self, queue_name, routing_key):
        if not self._basic_publish_connection:
            self._basic_publish_connection = pika.BlockingConnection(pika.URLParameters(self._url))
        if not self._basic_publish_channel:
            self._basic_publish_channel = self._basic_publish_connection.channel()
        self._basic_publish_channel.queue_declare(queue=queue_name, durable=True)
        if self._exchange != '':
            self._basic_publish_channel.exchange_declare(exchange=self._exchange, exchange_type='topic', durable=True)
            self._basic_publish_channel.queue_bind(exchange=self._exchange, queue=queue_name, routing_key=routing_key)

    def basic_publish(self, msg, routing_key):
        msg_json = json.dumps(msg)
        self._basic_publish_channel.basic_publish(exchange=self._exchange, routing_key=routing_key, body=msg_json, properties=pika.BasicProperties(delivery_mode=2))
        self._logger.info(json.dumps({"msg": "Sent message to rabbitmq", "routing_key": routing_key, "msg_json": msg_json}))

    def call_process_data_events(self):
        while not self._closing:
            time.sleep(15)
            if self._basic_publish_connection:
                try:
                    self._basic_publish_connection.process_data_events()
                except ConnectionClosed:
                    break
                except Exception:
                    pass


def create_async_consumer(amqp_url, logger, params):
    async_consumer = AsyncConsumer(amqp_url, logger, params)
    try:
        async_consumer.run()
        while True: time.sleep(100)
    except KeyboardInterrupt:
        async_consumer.stop()


def start_async_consumer_multithreaded(amqp_url, logger, params, num_threads):
    global threads
    for n in range(num_threads):
        thread = Thread(target=create_async_consumer, args=(amqp_url, logger, params,))
        thread.daemon = True
        thread.start()
        threads.append(thread)
        time.sleep(1)


def on_launch_message(delivery_tag, body, async_consumer):
    # msg = json.loads(body)
    print(body)
    for n in range(5):
        print('processing ' + body)
        time.sleep(1)
    async_consumer.acknowledge_message(delivery_tag)
    print('acked ' + body)

def publish_message(url, exch, routing_key, msg):
    conn = pika.BlockingConnection(pika.URLParameters(url))
    channel = conn.channel()
    channel.exchange_declare(exchange=exch, exchange_type='topic', durable=True)
    # channel.queue_declare(queue=queue_name, durable=True)
    # channel.queue_bind(exchange=exch, queue=queue_name, routing_key=routing_key)
    channel.basic_publish(exchange=exch, routing_key=routing_key, body=msg, properties=pika.BasicProperties(delivery_mode=2))



def main():
    cm_logger = logging.getLogger('pika_test')
    level = 10
    cm_logger.setLevel(level)

    stdout_handler = logging.StreamHandler(sys.stdout)
    stdout_handler.setLevel(logging.DEBUG)
    cm_logger.addHandler(stdout_handler)

    cml_adapter = logging.LoggerAdapter(cm_logger, {'build': 'debug', 'app_name': 'pika_test'})

    num_threads = 1
    start_async_consumer_multithreaded('amqps://bartSpikeUser:RocketDog99!@funny-finch.rmq.cloudamqp.com/bartsVHost', cml_adapter, {
        'exch': 'mission',
        'exch_type': 'topic',
        'durable': True,
        'queue_name': 'debug.dlp.pika_test',
        'exclusive': False,
        'auto_delete': False,
        'routing_key': None,
        'prefetch_count': 2,
        'no_ack': False,
        'on_message': on_launch_message
    }, num_threads)
    while True: time.sleep(100)


if __name__ == '__main__':
    main()
