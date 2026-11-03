import { maskEmail, maskPhone, normalizeEmail, normalizePhone } from './identity';

describe('normalizePhone', () => {
  it.each([
    ['0812-3456-7890', '6281234567890'],
    ['+62 812 3456 7890', '6281234567890'],
    ['(0812) 3456 7890', '6281234567890'],
    ['006281234567890', '6281234567890'],
    ['62081234567890', '6281234567890'], // country code followed by the local leading zero
    ['6281234567890', '6281234567890'],
  ])('reads %s as %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(['', 'abc', '12', '+62 812 abc', '0812345678901234567'])('rejects %p', (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe('normalizeEmail', () => {
  it('trims and lower-cases', () => {
    expect(normalizeEmail('  Ilham@Example.COM ')).toBe('ilham@example.com');
  });
});

describe('masking', () => {
  it('hides most of an email but keeps the domain', () => {
    expect(maskEmail('ilham@example.com')).toBe('i••••@example.com');
  });

  it('keeps only the country code and last three digits of a phone', () => {
    expect(maskPhone('6281234567890')).toBe('+62••••••••890');
  });
});
