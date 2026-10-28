// Policy content adapted from docs/compliance-policies.md.
// "{fee}" is replaced with the live registration fee from settings at render time.

export interface PolicyItem {
  text: string;
  sub?: string[];
}

export interface PolicySection {
  heading: string;
  items?: Array<string | PolicyItem>;
  ordered?: boolean;
}

export interface Policy {
  slug: 'terms' | 'refund' | 'privacy' | 'contact' | 'pricing';
  title: string;
  shortTitle: string;
  intro?: string;
  updated?: string;
  sections: PolicySection[];
}

export const SUPPORT = {
  email: 'syed516.sm@gmail.com',
  phones: [
    { name: 'Mansoor', shop: 'Sultan Sports, Kadapa', number: '9110744945' },
    { name: 'Sunil', shop: 'NR Sports, Vempalli', number: '8919155512' },
  ],
  address: [
    'Sultan Sports',
    'IMA Building, Shankarapuram',
    'Kadapa',
  ],
  hours: [
    { days: 'Monday to Saturday', time: '10:00 AM – 8:30 PM (IST)' },
    { days: 'Sunday', time: '11:00 AM – 5:00 PM (IST)' },
  ],
};

export const POLICIES: Policy[] = [
  {
    slug: 'terms',
    title: 'Terms and Conditions',
    shortTitle: 'Terms',
    updated: 'October 2026',
    intro:
      'Welcome to the official portal of the Tennis Ball Kadapa Premier League (T-KPL). By registering as a player, submitting personal details, or paying the registration fee, you agree to the following terms.',
    sections: [
      {
        heading: 'Tournament overview and organizers',
        items: [
          'The tournament is organized by **Sultan Sports (Kadapa)**, represented by Mansoor, in partnership with **NR Sports (Vempalli)**, represented by Sunil.',
          'All matches are played with official **Guru Laser Tennis Balls** in Kadapa, Andhra Pradesh, and are broadcast live on YouTube and social media.',
        ],
      },
      {
        heading: 'Player eligibility and verification',
        items: [
          '**Jurisdiction:** open strictly to residents of **New Kadapa** and **Old Kadapa** (YSR Kadapa District, Andhra Pradesh).',
          '**Age:** applicants must be between **15 and 50 years** at the time of registration.',
          '**Identity proof:** every registrant must show valid government photo ID (Aadhaar, Driving Licence or Voter ID) during physical scrutiny or jersey kit distribution.',
          '**Scrutiny and disqualification:** the organizing committee may reject or disqualify any application with falsified age, incorrect locality details, or duplicate entries.',
        ],
      },
      {
        heading: 'Registration, selection trials and auction',
        items: [
          {
            text: '**Stage 1, online registration:** submitting the form and paying the **{fee} fee** confirms your slot for the **T-KPL On-Ground Selection Trials**. Registration does not place a player directly into the auction pool.',
          },
          {
            text: '**Stage 2, ground selection trials:** all registered players are called for trials in Kadapa (tentatively from about 14 November 2026; venue and slot timings are sent by WhatsApp/SMS).',
            sub: [
              '**Bowlers:** bowl 1 full over (6 deliveries) under umpire and selector scrutiny.',
              '**Batsmen:** a dedicated batting slot to show shot selection, defence and power hitting.',
              '**All-rounders and wicket-keepers:** judged on their combined primary and secondary skills.',
              'Only players who clear the trial and meet performance standards are shortlisted.',
            ],
          },
          {
            text: '**Stage 3, final auction pool and team selection:** shortlisted players enter the Final T-KPL Player Auction Pool. Entry does **not guarantee selection**; teams are decided by franchise owners during live bidding.',
            sub: [
              'Selected players receive 1 official full team kit (shirt + trouser).',
              '1 official practice / additional T-shirt.',
              'Official match participation under the assigned franchise team.',
            ],
          },
        ],
      },
      {
        heading: 'Code of conduct and sportsmanship',
        items: [
          'Players must show sportsmanship, discipline and respect towards umpires, match referees, opponents and organizers.',
          'Indiscipline, on-field misconduct, abusive language or rule violations lead to immediate disqualification and a ban from future seasons, without refund.',
        ],
      },
      {
        heading: 'Media and broadcast rights',
        items: [
          'By registering, players grant the T-KPL organizing committee the perpetual right to photograph, record, live stream and publish their likeness, match statistics and team photos on YouTube, social media, banners and promotional material, without additional compensation.',
        ],
      },
      {
        heading: 'Limitation of liability',
        items: [
          'Cricket is a physical sport. Organizers make standard first-aid arrangements, but T-KPL, Sultan Sports, NR Sports and ground authorities are not liable for sports injuries, accidents, or loss of belongings during the trials, auction or matches.',
        ],
      },
    ],
  },
  {
    slug: 'refund',
    title: 'Cancellation and Refund Policy',
    shortTitle: 'Refunds',
    updated: 'October 2026',
    intro:
      'We believe in complete transparency with our players. Please read this policy before making any online payment.',
    sections: [
      {
        heading: 'Player registration fee ({fee})',
        items: [
          'The **{fee}** fee covers participation in the On-Ground Selection Trials, including ground booking, Guru Laser match balls, selector/umpire scrutiny, profile processing and system costs.',
          {
            text: '**Non-refundable:** once registration and payment are confirmed, the fee is **strictly non-refundable**. This includes:',
            sub: [
              '**Trial non-qualification:** not shortlisted for the Final Auction Pool.',
              '**Auction outcome:** a qualified player not picked by any franchise.',
              '**Trial absence:** not attending, or reporting late to, the assigned trial slot.',
            ],
          },
        ],
      },
      {
        heading: 'When a refund is issued',
        ordered: true,
        items: [
          '**Tournament cancellation:** if the tournament is officially cancelled or abandoned before the auction and not rescheduled, 100% of the fee is refunded.',
          '**Duplicate or excess payment:** if you are debited twice for the same registration, the duplicate amount is refunded in full.',
        ],
      },
      {
        heading: 'Refund request and processing time',
        items: [
          '**Reporting window:** report duplicate or failed payment deductions within **7 days** of the transaction by emailing {email} or messaging the support numbers, with your Registration ID and Razorpay Payment ID.',
          '**Processing time:** once approved, refunds go through Razorpay to the original payment source (UPI or bank account) within **5 to 7 business days**.',
          'No cash refunds are issued for online transactions.',
        ],
      },
    ],
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    shortTitle: 'Privacy',
    updated: 'October 2026',
    intro:
      'The T-KPL organizing committee is committed to protecting the personal information and privacy of every player.',
    sections: [
      {
        heading: 'Information we collect',
        items: [
          '**Personal identification:** full name, date of birth, father\'s/guardian\'s name.',
          '**Contact:** mobile number and emergency contact number.',
          '**Location:** locality, ward or town within Kadapa.',
          '**Cricket profile:** batting hand, bowling style, playing role, prior experience.',
          '**Photograph:** player portrait, used only for your player ID card, digital receipt and live auction banner.',
          '**Payment records:** transaction reference IDs and Razorpay payment timestamps. We **never** store banking passwords, UPI PINs or card details.',
        ],
      },
      {
        heading: 'How we use your information',
        items: [
          'To verify eligibility and residency in Kadapa.',
          'To create your downloadable digital receipt and unique QR code.',
          'To prepare team sheets, auction cards and live broadcast graphics.',
          'To share match schedules, venue updates and trial dates by WhatsApp or SMS.',
        ],
      },
      {
        heading: 'Data protection and storage',
        items: [
          'Player records and photographs are stored on encrypted cloud servers (Supabase) with access limited to authorized tournament administrators.',
          '**We do not sell, rent, trade or share your personal details with third-party advertising or marketing agencies.**',
        ],
      },
    ],
  },
  {
    slug: 'pricing',
    title: 'Pricing and Service Description',
    shortTitle: 'Pricing',
    sections: [],
  },
  {
    slug: 'contact',
    title: 'Contact Us and Support',
    shortTitle: 'Contact',
    intro:
      'For questions about registration, technical issues, payment verification or franchise enquiries, contact the official organizing team.',
    sections: [],
  },
];

export const PRICING_ROWS: Array<{ field: string; detail: string }> = [
  {
    field: 'Product / service',
    detail: 'T-KPL Season 1 Player Registration and On-Ground Selection Trial Entry Slot',
  },
  { field: 'Official price', detail: '{fee} INR (all-inclusive)' },
  { field: 'Payment mode', detail: '100% online via UPI (PhonePe, Google Pay, Paytm, BHIM QR)' },
  {
    field: 'Fulfilment / delivery',
    detail:
      'Immediate: a verifiable digital entry receipt with QR code is issued as soon as payment succeeds. It grants entry to the on-ground Selection Trials (Nov 2026). Qualified players enter the Final Auction Pool. Selected team players receive their physical kit before match day.',
  },
];
