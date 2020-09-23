enum StepStatus {NOT_STARTED = 0, RUNNING = 10, INTERRUPTED = 15, SUCCEEDED = 20, FAILED = 22, CANCELLED = 21}

enum TaskStatus {NOT_STARTED = 0, WAITING_FOR_AGENT = 3, PUBLISHED = 5, RUNNING = 10, INTERRUPTING = 14, INTERRUPTED = 15, CANCELING = 17, SUCCEEDED = 20, CANCELLED = 21, FAILED = 22, SKIPPED = 23};

enum TaskFailureCode {AGENT_CRASHED_OR_LOST_CONNECTIVITY = 0, NO_AGENT_AVAILABLE = 1, AGENT_EXEC_ERROR = 2, QUEUED_TASK_EXPIRED = 3, TARGET_AGENT_NOT_SPECIFIED = 4, MISSING_TARGET_TAGS = 5, LAUNCH_TASK_ERROR = 6, TASK_EXEC_ERROR = 7}

enum JobStatus {NOT_STARTED = 0, RUNNING = 10, INTERRUPTING = 14, INTERRUPTED = 15, CANCELING = 17, COMPLETED = 20, FAILED = 22, SKIPPED = 23}

enum LogLevel {ERROR = 40, WARNING = 30, INFO = 20, DEBUG = 10}

enum TaskSource {CONSOLE = 0, JOB = 1, API = 2}

enum TeamPaymentStatus { HEALTHY = 0, DELINQUENT = 1 }

enum InvoiceStatus { CREATED = 0, SUBMITTED = 1, PAID = 2, PARTIALLY_PAID = 3, REJECTED = 4 }

enum PaymentMethodType {CREDIT_CARD = 0}

enum PaymentTransactionSource {BRAINTREE = 0}

enum PaymentTransactionType {CHARGE = 0}

enum PaymentTransactionStatus {APPROVED = 0, REJECTED = 1, SETTLED = 2, DISPUTED = 3, RESOLVED = 4}

enum TeamPricingTier { FREE = 0, PAID = 1 }

enum ExecutionEnvironment { CLIENT = 0, AWS_LAMBDA = 1, GCP_FUNCTION = 2, AMAZON_AUTOMATION = 3 }

const enumKeyToPretty = function(theEnum: any, enumKey: any): string {
  if(enumKey === undefined || enumKey === null){
    return '';
  } 
  
  const enumValue = theEnum[enumKey];
  if(!enumValue) return '';
  //if(!enumKey) debugger;
  return enumValue.split('_')
          .reduce((result: any, current: any) => {
              current = current.toLowerCase();
              current = `${current.substring(0, 1).toUpperCase()}${current.substring(1)}`;
            return `${result ? ' ' + result : ''}${current}`;
          }, '');
};

// Only return the strings and make them pretty
const enumKeys = function(theEnum: any): string[] {
  const output = [];
  for(let enumKey in theEnum){
    if(!isNaN(Number(enumKey))){
      output.push(enumKey);
    }
  }
  return output;
}

export { StepStatus, TaskStatus, TaskFailureCode, JobStatus, LogLevel, TaskSource, TeamPaymentStatus, InvoiceStatus, PaymentMethodType, PaymentTransactionSource, PaymentTransactionType, PaymentTransactionStatus, TeamPricingTier, enumKeyToPretty, enumKeys, ExecutionEnvironment };