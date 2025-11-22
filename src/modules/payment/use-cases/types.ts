import type { AppError } from "../../../shared/exceptions/errors";
import type { Result } from "../../../shared/utils/result.utils";

export interface UseCase<TCommand, TResult> {
  execute(command: TCommand): Promise<Result<TResult, AppError>>;
}
