// All user-facing strings in one place so a Bahasa Indonesia translation is a single file.
// Rules: sentence case, plain verbs, a button names what it does, errors say what to do next.

export const copy = {
  tagline: 'Every visit brings a little more.',

  landing: {
    title: 'A stamp card that lives on your phone.',
    body: 'Join the places you already visit. Collect a stamp each time, watch the card fill up, and claim what you have earned.',
    create: 'Create account',
    login: 'Log in',
    sampleLabel: 'Sample card',
    sampleName: 'ABC Coffee',
  },

  register: {
    title: 'Create your account',
    haveAccount: 'Already a member?',
    login: 'Log in',
    slotLabels: ['About you', 'Verify by', 'Code', 'Member'],
    steps: {
      details: {
        heading: 'Tell us about you',
        body: 'One account works at every business that uses Bunus.',
        name: 'Your name',
        email: 'Email',
        password: 'Password',
        passwordHint: 'At least 8 characters.',
        next: 'Continue',
      },
      channel: {
        heading: 'Where should we send your code?',
        body: 'Pick the way that is easiest for you.',
        email: 'Email',
        emailHint: 'We will use the address you entered.',
        whatsapp: 'WhatsApp',
        sms: 'SMS',
        phoneHint: 'Needs your phone number.',
        phone: 'Phone number',
        phoneHelp: 'Start with 0 or include the country code, for example 0812 3456 7890.',
        send: 'Send code',
        back: 'Back',
      },
      code: {
        heading: 'Enter your code',
        // {where} is replaced with the masked address or number.
        body: 'We sent a code to {where}.',
        label: 'Code',
        submit: 'Create account',
        resend: 'Send a new code',
        resendIn: 'You can ask for a new code in {s} seconds.',
        resendsLeft: 'You have {n} new codes left.',
        noResends: 'No more new codes for this signup.',
        startOver: 'Start again',
        noCodeHelp: 'No code after a minute? You may already have an account.',
        loginInstead: 'Log in instead',
        changeWay: 'Use a different way',
      },
      done: {
        heading: 'You are in, {name}.',
        body: 'Your account is ready. Join a business with its QR code or link and your first stamp goes on the card.',
        go: 'Go to my cards',
      },
    },
  },

  login: {
    title: 'Welcome back',
    body: 'Log in to see your cards.',
    email: 'Email',
    password: 'Password',
    submit: 'Log in',
    newHere: 'New to Bunus?',
    create: 'Create account',
  },

  member: {
    greeting: 'Hi, {name}.',
    emptyTitle: 'No cards yet',
    emptyBody:
      'When a business you visit uses Bunus, scan its QR code or open its link to join. Your stamps will show up here.',
    logout: 'Log out',
    signedInAs: 'Signed in as {who}',
  },

  errors: {
    network: "We can't reach Bunus. Check your connection and try again.",
    generic: 'Something went wrong. Try again in a moment.',
    nameRequired: 'Enter your name.',
    emailInvalid: 'Enter a valid email address.',
    passwordShort: 'Use at least 8 characters.',
    phoneRequired: 'Enter your phone number.',
    codeFormat: 'Enter the digits from your code.',
  },
} as const;

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}
