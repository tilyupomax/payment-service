export type Result<TValue, TError> = SuccessResult<TValue> | ErrorResult<TError>;

interface SuccessResult<TValue> {
  readonly ok: true;
  readonly value: TValue;
}

interface ErrorResult<TError> {
  readonly ok: false;
  readonly error: TError;
}

export const ok = <TValue>(value: TValue): Result<TValue, never> => ({
  ok: true,
  value
});

export const err = <TError>(error: TError): Result<never, TError> => ({
  ok: false,
  error
});

export const isOk = <TValue, TError>(result: Result<TValue, TError>): result is SuccessResult<TValue> =>
  result.ok;

export const isErr = <TValue, TError>(result: Result<TValue, TError>): result is ErrorResult<TError> =>
  !result.ok;

export const map = <TValue, TError, TMapped>(
  result: Result<TValue, TError>,
  mapper: (value: TValue) => TMapped
): Result<TMapped, TError> => (result.ok ? ok(mapper(result.value)) : result);

export const mapError = <TValue, TError, TMappedError>(
  result: Result<TValue, TError>,
  mapper: (error: TError) => TMappedError
): Result<TValue, TMappedError> => (result.ok ? result : err(mapper(result.error)));

