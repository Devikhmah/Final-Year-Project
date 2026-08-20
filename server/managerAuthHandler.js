export function handleVerifyManagerCode({ code }) {
  const serverCode = process.env.MANAGER_SIGNUP_CODE || 'SME2026SECRET';

  if (!code || typeof code !== 'string' || code.trim() !== serverCode.trim()) {
    return {
      success: false,
      error: 'Invalid Manager Access Code. Manager registration rejected.',
    };
  }

  return {
    success: true,
    message: 'Manager access code verified successfully.',
  };
}
