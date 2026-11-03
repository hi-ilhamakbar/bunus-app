// English. This file defines the shape every other language must match.
// Rules: sentence case, plain verbs, a button names what it does, errors say what to do next.

export const en = {
  tagline: 'Every visit brings a little more.',

  common: {
    skip: 'Skip to content',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    language: 'Language',
    home: 'Bunus home',
  },

  notFound: {
    title: "This page doesn't exist",
    body: 'The link may be old, or typed a little differently.',
    home: 'Go to Bunus home',
  },

  landing: {
    title: 'A stamp card that lives on your phone.',
    body: 'Join the places you already visit. Collect a stamp each time, watch the card fill up, and claim what you have earned.',
    create: 'Create account',
    login: 'Log in',
    sampleLabel: 'Sample card',
    sampleName: 'ABC Coffee',
    sampleNote: '5 of 8 stamps',
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
    passwordRequired: 'Enter your password.',
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

  // Server messages by error code. {s} is filled from details.retryAfterSeconds.
  apiErrors: {
    CHANNEL_UNAVAILABLE: 'That way of verifying is not available right now. Pick another.',
    INVALID_PHONE: "That phone number doesn't look right. Include the country code or start with 0.",
    PHONE_REQUIRED: 'Enter your phone number to get a code by WhatsApp or SMS.',
    OTP_COOLDOWN: 'A code was just sent. Wait {s} seconds before asking for another.',
    OTP_UNAVAILABLE: "We can't send codes this way right now. Try another way to verify.",
    TRY_AGAIN_LATER: 'We are sending a lot of codes right now. Wait a moment and try again.',
    RESEND_LIMIT: "You've used all the new codes for this signup. Start again or pick another way to verify.",
    CODE_INVALID: "That code isn't right. Check it and try again, or request a new one.",
    CODE_EXPIRED: 'That code has expired. Request a new one.',
    TOO_MANY_ATTEMPTS: 'Too many wrong codes. Request a new code to try again.',
    CODE_ALREADY_USED: 'That code was already used. Request a new one.',
    CODE_NOT_SENT: 'No code has been sent yet. Request a new one.',
    SIGNUP_EXPIRED: 'This signup has expired. Start again to get a new code.',
    ALREADY_SUBMITTED: 'This signup was already completed. Log in to continue.',
    ACCOUNT_EXISTS: 'An account with these details already exists. Log in instead.',
    INVALID_CREDENTIALS: 'The email or password is wrong. Check them and try again.',
    UNAUTHENTICATED: 'Log in to continue.',
    FORBIDDEN_ORIGIN: 'This request was blocked. Reload the page and try again.',
    VALIDATION_FAILED: 'Check the highlighted fields and try again.',
  } as Record<string, string>,
}
