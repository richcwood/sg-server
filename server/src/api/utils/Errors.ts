import { TaskFailureCode } from "../../shared/Enums";

export class MissingObjectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingObjectError";
  }
}

export class FreeTierLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FreeTierLimitExceededError";
  }
}

export class LaunchTaskError extends Error {
  private readonly taskFailureCode: TaskFailureCode | undefined;
  private readonly context: any | undefined;

  constructor(message: string, taskFailureCode: TaskFailureCode, context?: any) {
    super(message);
    this.name = "LaunchTask Error";
    this.taskFailureCode = taskFailureCode;
    this.context = context;
  }

  public getFailureCode(): TaskFailureCode | undefined {
    return this.taskFailureCode;
  }

  public getContext(): any | undefined {
    return this.context;
  }
}

export class ValidationError extends Error {
  private readonly path: string | undefined;

  constructor(message: string, path?: string) {
    super(message);
    this.name = "Validation Error";
    this.path = path;
  }

  public getPath(): string | undefined {
    return this.path;
  }
}

export class ForbiddenError extends Error {
  private readonly path: string | undefined;

  constructor(message: string, path?: string) {
    super(message);
    this.name = "Forbidden";
    this.path = path;
  }

  public getPath(): string | undefined {
    return this.path;
  }
}
