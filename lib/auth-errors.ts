export function loginErrorMessage(
  error: { message: string; code?: string },
  mode: string,
) {
  return mode === "login" &&
    (error.code === "invalid_credentials" ||
      /invalid.*credentials/i.test(error.message))
    ? "The password is wrong, or the email does not match an account. Please try again."
    : error.message;
}
