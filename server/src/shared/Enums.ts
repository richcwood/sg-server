/**
 * Created by richwood on 3/6/18.
 */

enum StepStatus {NOT_STARTED = 0, RUNNING = 10, INTERRUPTED = 15, SUCCEEDED = 20, FAILED = 22, CANCELLED = 21}
export { StepStatus };

enum TaskStatus {NOT_STARTED = 0, WAITING_FOR_AGENT = 3, PUBLISHED = 5, RUNNING = 10, INTERRUPTING = 14, INTERRUPTED = 15, CANCELING = 17, SUCCEEDED = 20, CANCELLED = 21, FAILED = 22, SKIPPED = 23}
export { TaskStatus };

enum TaskFailureCode {AGENT_CRASHED_OR_LOST_CONNECTIVITY = 0, NO_AGENT_AVAILABLE = 1, AGENT_EXEC_ERROR = 2, QUEUED_TASK_EXPIRED = 3, TARGET_AGENT_NOT_SPECIFIED = 4, MISSING_TARGET_TAGS = 5, LAUNCH_TASK_ERROR = 6, TASK_EXEC_ERROR = 7}
export { TaskFailureCode };

enum JobStatus {NOT_STARTED = 0, PREPUBLISH = 5, RUNNING = 10, INTERRUPTING = 14, INTERRUPTED = 15, CANCELING = 17, COMPLETED = 20, FAILED = 22, SKIPPED = 23}
export { JobStatus };

enum JobDefStatus {RUNNING = 10, PAUSED = 15}
export { JobDefStatus };

enum LogLevel {ERROR = 40, WARNING = 30, INFO = 20, DEBUG = 10}
export { LogLevel };

enum TaskSource {CONSOLE = 0, JOB = 1}
export { TaskSource };

enum UserTeamStatus { ACTIVE = 0, INACTIVE = 1, INVITED } // someone deactivated this user from the team
export { UserTeamStatus };

enum ScriptType { PYTHON = 0, NODE = 1, SH = 2, CMD = 3, RUBY = 4, LUA = 5, PERL = 6, PHP = 7, POWERSHELL = 8 }
export { ScriptType };

const ScriptTypeDetails: any = {
    PYTHON: {
        cmd: 'python'
    },
    NODE: {
        cmd: 'node'
    },
    RUBY: {
        cmd: 'ruby'
    },
    LUA: {
        cmd: 'lua'
    },
    PERL: {
        cmd: 'perl'
    },
    PHP: {
        cmd: 'php'
    },
    POWERSHELL: {
        cmd: 'powershell'
    }
}
export { ScriptTypeDetails }

enum TeamPaymentStatus { HEALTHY = 0, DELINQUENT = 1 }
export { TeamPaymentStatus };

enum InvoiceStatus { CREATED = 0, SUBMITTED = 1, PAID = 2, PARTIALLY_PAID = 3, REJECTED = 4 }
export { InvoiceStatus };

enum PaymentMethodType {CREDIT_CARD = 0}
export { PaymentMethodType };

enum PaymentTransactionSource {BRAINTREE = 0}
export { PaymentTransactionSource };

enum PaymentTransactionType {CHARGE = 0}
export { PaymentTransactionType };

enum PaymentTransactionStatus {APPROVED = 0, REJECTED = 1, SETTLED = 2, DISPUTED = 3, RESOLVED = 4}
export { PaymentTransactionStatus };

enum TeamPricingTier { FREE = 0, PAID = 1 }
export { TeamPricingTier }

enum AccessRight {
    // no access rights for now
}
export { AccessRight }

enum TaskDefTarget { SINGLE_AGENT = 1, ALL_AGENTS = 2, SINGLE_AGENT_WITH_TAGS = 4, ALL_AGENTS_WITH_TAGS = 8, SINGLE_SPECIFIC_AGENT = 16, AWS_LAMBDA = 32, GCP_FUNCTION = 64, AMAZON_AUTOMATION = 128 }
export { TaskDefTarget }
