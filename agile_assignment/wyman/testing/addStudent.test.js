const { validateContact, validateAge, validateEnrollmentDate } = require('../addStudent.js');

describe('Validation Functions', () => {
  test('validateContact: Should pass with valid contact', () => {
    expect(() => validateContact('1234567890')).not.toThrow();
  });

  test('validateContact: Should fail with invalid contact', () => {
    expect(() => validateContact('abc123')).toThrow('Contact number must contain only digits.');
  });

  test('validateAge: Should pass for age 7 or older', () => {
    const today = new Date();
    today.setFullYear(today.getFullYear() - 7);
    expect(() => validateAge(today.toISOString().split('T')[0])).not.toThrow();
  });

  test('validateAge: Should fail for age less than 7', () => {
    const today = new Date();
    today.setFullYear(today.getFullYear() - 6);
    expect(() => validateAge(today.toISOString().split('T')[0])).toThrow('Student must be at least 7 years old.');
  });

  test('validateEnrollmentDate: Should pass for today\'s or future date', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(() => validateEnrollmentDate(today)).not.toThrow();
  });

  test('validateEnrollmentDate: Should fail for past date', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(() => validateEnrollmentDate(yesterday.toISOString().split('T')[0])).toThrow('Enrollment date must be today or a future date.');
  });
});
