import * as mongoose from 'mongoose';

interface Metrics {
  [key: string] : string|number;
}

export class MetricsLogger {

  private static isInitialized = false;

  private static cpu_lastTime: [number, number];
  private static cpu_lastUsage: NodeJS.CpuUsage;

  private static sql_count: number;
  private static sql_totalTime: number;
  private static sql_timesPerCollection: {[collectionName: string]: number};

  public static init(){
    if(!MetricsLogger.isInitialized){
      MetricsLogger.isInitialized = true;

      MetricsLogger.cpu_lastTime = process.hrtime();
      MetricsLogger.cpu_lastUsage = process.cpuUsage();

      MetricsLogger.sql_count = 0;
      MetricsLogger.sql_totalTime = 0;
      MetricsLogger.sql_timesPerCollection = {};
      MetricsLogger.initializeMongooseLogging();

      setInterval(MetricsLogger.logMetrics, 30000);
    }
    else {
      // Rich - switch this to a warn logger statement
      console.warn('You tried to initialize the MetricsLogger multiple times');
    }
  }

  private static initializeMongooseLogging(){
    const targetMethods = [
      'find',
      'findOne',
      'count',
      'countDocuments',
      'estimatedDocumentCount',
      'findOneAndUpdate',
      'findOneAndRemove',
      'findOneAndDelete',
      'deleteOne',
      'deleteMany',
      'remove',
    ];

    const preHook = function(){
      // @ts-ignore
      this.__startTime = Date.now();
    };

    const postHook = function(){
      // @ts-ignore
      const target:any = this;
      if (target.__startTime) {
        MetricsLogger.trackSqlQuery(target._collection.collectionName, Date.now() - target.__startTime);
      }
    };

    mongoose.plugin((targetSchema: any) => {
      targetMethods.forEach((method: any) => {
        targetSchema.pre(method, preHook);
        targetSchema.post(method, postHook);
      });
    });
  }

  private static logMetrics(){
    try {
      const metrics = {};
      MetricsLogger.appendCpuUsage(metrics);
      MetricsLogger.appendMemoryUsage(metrics);
      MetricsLogger.appendSqlUsage(metrics);
      MetricsLogger.log(metrics);
    }
    catch(err){
      // Rich - switch this to error logger statement
      console.error('Error trying to logMetrics', err);
    }
  }

  private static appendCpuUsage(metrics: Metrics){
    const elapsedTime = process.hrtime(MetricsLogger.cpu_lastTime);
    const elapsedUsage = process.cpuUsage(MetricsLogger.cpu_lastUsage);

    const elapsedTimeMS = MetricsLogger.secNSec2ms(elapsedTime);
    const elapsedUserMS = MetricsLogger.secNSec2ms(elapsedUsage.user);
    const elapsedSystemMS = MetricsLogger.secNSec2ms(elapsedUsage.system);

    const cpuPercent = (100 * (elapsedUserMS + elapsedSystemMS) / elapsedTimeMS).toFixed(2);
    metrics.CpuPercent = cpuPercent;

    MetricsLogger.cpu_lastTime = process.hrtime();
    MetricsLogger.cpu_lastUsage = process.cpuUsage();
  }

  private static appendMemoryUsage(metrics: Metrics){
    metrics.HeapUsed = Math.round(process.memoryUsage().heapUsed/1024/1024);
    metrics.HeapTotal = Math.round(process.memoryUsage().heapTotal/1024/1024);
  }

  private static secNSec2ms(secNSec){
    if(Array.isArray(secNSec)){
      return secNSec[0] * 1000 + secNSec[1] / 1000000;
    }
    else {
      return secNSec / 1000;
    }
  }

  private static trackSqlQuery(collectionName: string, elapsedTime: number){
    MetricsLogger.sql_count++;
    MetricsLogger.sql_totalTime += elapsedTime;

    if(!MetricsLogger.sql_timesPerCollection){
      MetricsLogger.sql_timesPerCollection = {};
    }
    if(!MetricsLogger.sql_timesPerCollection[collectionName]){
      MetricsLogger.sql_timesPerCollection[collectionName] = elapsedTime;
    }
    else {
      MetricsLogger.sql_timesPerCollection[collectionName] += elapsedTime;
    }
  }

  private static appendSqlUsage(metrics: Metrics){
    if(MetricsLogger.sql_count > 0){
      metrics.SqlCount = MetricsLogger.sql_count;
      metrics.SqlAvgTime = (MetricsLogger.sql_totalTime / MetricsLogger.sql_count).toFixed(2);

      // Compute the slowest 3 collections and total time waited on them
      const slowestCollections = Object.entries(MetricsLogger.sql_timesPerCollection).sort((a: any, b: any) => b[1] - a[1]).splice(0, 3);

      for(let slowCount = 0; slowCount < slowestCollections.length; slowCount++){
        metrics[`TotalWaitCollection_${slowCount + 1}`] = slowestCollections[slowCount][0];
        metrics[`TotalWait_${slowCount + 1}`] = slowestCollections[slowCount][1];
      }

      MetricsLogger.sql_count = 0;
      MetricsLogger.sql_totalTime = 0;
      MetricsLogger.sql_timesPerCollection = {};
    }
  }

  private static log(metrics: Metrics){
    const metricsLogString = Object.entries(metrics).map((entry: any) => {
      return entry[1] !== undefined ? `${entry[0]}="${entry[1]}"` : ''
    }).join(' ');
    // Rich - switch to a new logger statement that goes to a new file metrics.log that only has metrics
    // This entry should be prepended with the current date+time
    console.log(metricsLogString);
  }
}