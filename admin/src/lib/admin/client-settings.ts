export type ClientSettingsSection =
  | 'branding'
  | 'homepage'
  | 'catalog'
  | 'product-detail'
  | 'inquiry'
  | 'preview'
  | 'navigation'
  | 'footer'
  | 'seo'
  | 'i18n'
  | 'policies';

export type ClientSettingsSectionKey =
  | 'brandingJson'
  | 'homepageJson'
  | 'catalogJson'
  | 'productDetailJson'
  | 'inquiryJson'
  | 'previewJson'
  | 'navigationJson'
  | 'footerJson'
  | 'seoJson'
  | 'i18nJson'
  | 'policiesJson';

export type ClientPreviewDevice = 'desktop' | 'tablet' | 'mobile';

export type ClientSettingsVersion = {
  id: string;
  version: number;
  label: string;
  status: 'published' | 'restored';
  settings: ClientSettings;
  createdBy: string;
  createdAt: string;
  publishedAt: string;
  changedSections: ClientSettingsSection[];
  note?: string;
};

export type NavItemSetting = {
  label: string;
  href: string;
  visible: boolean;
};

export type FooterLinkSetting = {
  label: string;
  href: string;
  visible: boolean;
};

export type BrandingSettings = {
  logoUrl: string;
  faviconUrl: string;
  brandName: string;
  tagline: string;
  accentPreset: 'atelier green' | 'champagne black' | 'rose editorial' | 'quiet navy';
  heroImage: string;
};

export type HomepageSettings = {
  announcementEnabled: boolean;
  announcementText: string;
  heroTitle: string;
  heroSubtitle: string;
  ctaText: string;
  featuredSections: string[];
  editorialBlocks: string[];
};

export type CatalogSettings = {
  defaultSort: 'editorial' | 'newest' | 'price-low' | 'price-high' | 'availability';
  visibleFilters: string[];
  categoryOrder: string[];
  showUnavailableItems: boolean;
  badgeLogic: string;
  quickActionsEnabled: boolean;
};

export type ProductDetailSettings = {
  sectionOrder: string[];
  showStylistNote: boolean;
  showMeasurements: boolean;
  showFabrics: boolean;
  relatedProductsMode: 'same category' | 'editorial picks' | 'recently viewed';
  relatedProductsLimit: number;
  rentalNoteBlock: string;
};

export type InquirySettings = {
  enabledFields: string[];
  requiredFields: string[];
  helperText: string;
  trustBlock: string[];
  pickupNote: string;
  depositNote: string;
  shippingNote: string;
};

export type PreviewSettings = {
  enabled: boolean;
  acceptedFileInfo: string;
  disclaimer: string;
  reviewCopy: string;
  turnaroundNote: string;
};

export type NavigationSettings = {
  topNavItems: NavItemSetting[];
};

export type FooterSettings = {
  contactEmail: string;
  hotline: string;
  zalo: string;
  address: string;
  socialLinks: FooterLinkSetting[];
  footerLinks: FooterLinkSetting[];
};

export type SeoSettings = {
  siteTitleTemplate: string;
  metaDescription: string;
  ogImage: string;
};

export type I18nSettings = {
  enabledLocales: string[];
  defaultLocale: string;
  fallbackLocale: string;
};

export type PoliciesSettings = {
  rentalPolicy: string;
  depositPolicy: string;
  pickupPolicy: string;
  returnPolicy: string;
  shippingPolicy: string;
  damagePolicy: string;
};

export type ClientSettings = {
  brandingJson: BrandingSettings;
  homepageJson: HomepageSettings;
  catalogJson: CatalogSettings;
  productDetailJson: ProductDetailSettings;
  inquiryJson: InquirySettings;
  previewJson: PreviewSettings;
  navigationJson: NavigationSettings;
  footerJson: FooterSettings;
  seoJson: SeoSettings;
  i18nJson: I18nSettings;
  policiesJson: PoliciesSettings;
  updatedBy: string;
  updatedAt: string;
  publishedAt?: string;
};

export const sectionKeyBySlug: Record<ClientSettingsSection, ClientSettingsSectionKey> = {
  branding: 'brandingJson',
  homepage: 'homepageJson',
  catalog: 'catalogJson',
  'product-detail': 'productDetailJson',
  inquiry: 'inquiryJson',
  preview: 'previewJson',
  navigation: 'navigationJson',
  footer: 'footerJson',
  seo: 'seoJson',
  i18n: 'i18nJson',
  policies: 'policiesJson',
};

export const clientSettingsDefaults: ClientSettings = {
  brandingJson: {
    logoUrl: '',
    faviconUrl: '/favicon.ico',
    brandName: 'ChouVie',
    tagline: 'Private rental atelier for event styling',
    accentPreset: 'atelier green',
    heroImage: 'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?auto=format&fit=crop&w=2200&q=92',
  },
  homepageJson: {
    announcementEnabled: true,
    announcementText: 'Private fittings available this weekend. Book early for wedding season.',
    heroTitle: 'Wear the evening once.',
    heroSubtitle: 'A cinematic rental edit for weddings, openings, private dinners, and every night that deserves a silhouette.',
    ctaText: 'Explore collection',
    featuredSections: ['New arrivals', 'Wedding guest edit', 'Evening gowns'],
    editorialBlocks: [
      'A wardrobe for the moments that refuse repetition.',
      'No cart pressure. No checkout theatre. Just a considered request.',
    ],
  },
  catalogJson: {
    defaultSort: 'editorial',
    visibleFilters: ['Search', 'Category', 'Start date', 'End date'],
    categoryOrder: ['Dress', 'Gown', 'Ao Dai', 'Vest'],
    showUnavailableItems: false,
    badgeLogic: 'Show rental rate and AI preview badges on product cards.',
    quickActionsEnabled: true,
  },
  productDetailJson: {
    sectionOrder: ['Gallery', 'Summary', 'Dates', 'Rental notes', 'AI preview', 'Related pieces'],
    showStylistNote: true,
    showMeasurements: true,
    showFabrics: true,
    relatedProductsMode: 'same category',
    relatedProductsLimit: 4,
    rentalNoteBlock: 'Fitting, condition and final availability are confirmed by the atelier before approval.',
  },
  inquiryJson: {
    enabledFields: ['Name', 'Phone', 'Email', 'Styling notes'],
    requiredFields: ['Name', 'Phone', 'Email'],
    helperText: 'Tell us the event date, preferred silhouette and fitting window.',
    trustBlock: ['No online deposit required', 'Try at store before confirming'],
    pickupNote: 'Pickup windows are confirmed after fitting.',
    depositNote: 'Deposit is collected only after availability and fit are confirmed.',
    shippingNote: 'Courier options are confirmed case by case.',
  },
  previewJson: {
    enabled: true,
    acceptedFileInfo: 'Natural light, front-facing portrait, JPG or PNG.',
    disclaimer: 'Preview is a visual fit signal, not a final fitting guarantee.',
    reviewCopy: 'Stylist review focuses on silhouette, shoulder line and visual balance.',
    turnaroundNote: 'Most preview requests are reviewed within one business day.',
  },
  navigationJson: {
    topNavItems: [
      { label: 'Collection', href: '/products', visible: true },
      { label: 'AI Preview', href: '/products/demo/preview', visible: true },
      { label: 'Inquiry', href: '/checkout', visible: true },
    ],
  },
  footerJson: {
    contactEmail: 'atelier@chouvie.vn',
    hotline: '+84 90 000 0000',
    zalo: 'ChouVie Atelier',
    address: 'District 1, Ho Chi Minh City',
    socialLinks: [
      { label: 'Instagram', href: 'https://instagram.com', visible: true },
      { label: 'TikTok', href: 'https://tiktok.com', visible: true },
    ],
    footerLinks: [
      { label: 'Rental policy', href: '/policies/rental', visible: true },
      { label: 'Returns', href: '/policies/returns', visible: true },
      { label: 'Contact', href: '/checkout', visible: true },
    ],
  },
  seoJson: {
    siteTitleTemplate: '%s | ChouVie Rental Fashion',
    metaDescription: 'Luxury fashion rental commerce with private fitting and AI preview.',
    ogImage: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=90',
  },
  i18nJson: {
    enabledLocales: ['en', 'vi'],
    defaultLocale: 'en',
    fallbackLocale: 'en',
  },
  policiesJson: {
    rentalPolicy: 'Rental windows are confirmed by product availability, fitting appointment and event date.',
    depositPolicy: 'Security deposit is collected after confirmation and returned after item inspection.',
    pickupPolicy: 'Pickup is completed in store after QR verification and condition check.',
    returnPolicy: 'Return items by the agreed time to avoid late fees.',
    shippingPolicy: 'Shipping is optional and depends on item risk, customer location and timeline.',
    damagePolicy: 'Damage, missing accessories or heavy cleaning may be deducted from the security deposit.',
  },
  updatedBy: 'Linh Nguyen',
  updatedAt: '2026-04-23T09:30:00.000Z',
  publishedAt: '2026-04-22T17:45:00.000Z',
};

export const defaultClientSettingsVersions: ClientSettingsVersion[] = [
  {
    id: 'client-settings-v1',
    version: 1,
    label: 'Initial storefront baseline',
    status: 'published',
    settings: clientSettingsDefaults,
    createdBy: clientSettingsDefaults.updatedBy,
    createdAt: clientSettingsDefaults.publishedAt ?? clientSettingsDefaults.updatedAt,
    publishedAt: clientSettingsDefaults.publishedAt ?? clientSettingsDefaults.updatedAt,
    changedSections: ['branding', 'homepage', 'catalog', 'product-detail', 'inquiry', 'preview', 'navigation', 'footer', 'seo', 'i18n', 'policies'],
    note: 'Default premium rental storefront configuration.',
  },
];

export const clientSettingsGroups: Array<{
  label: string;
  items: Array<{ slug: ClientSettingsSection; label: string; description: string }>;
}> = [
  {
    label: 'Storefront',
    items: [
      { slug: 'branding', label: 'Branding', description: 'Logo, palette and primary campaign image.' },
      { slug: 'homepage', label: 'Homepage', description: 'Hero, editorial blocks and announcement bar.' },
      { slug: 'catalog', label: 'Catalog', description: 'Collection filters, sort and card behavior.' },
      { slug: 'product-detail', label: 'Product detail', description: 'Detail page sections and rental notes.' },
    ],
  },
  {
    label: 'Conversion',
    items: [
      { slug: 'inquiry', label: 'Inquiry', description: 'Checkout form fields, trust copy and handoff notes.' },
      { slug: 'preview', label: 'AI preview', description: 'Preview availability, upload guidance and review copy.' },
    ],
  },
  {
    label: 'Structure',
    items: [
      { slug: 'navigation', label: 'Navigation', description: 'Top navigation labels, order and visibility.' },
      { slug: 'footer', label: 'Footer', description: 'Contact details, social links and footer links.' },
    ],
  },
  {
    label: 'Governance',
    items: [
      { slug: 'seo', label: 'SEO', description: 'Title pattern, description and share image.' },
      { slug: 'i18n', label: 'i18n', description: 'Enabled locales and fallback behavior.' },
      { slug: 'policies', label: 'Policies', description: 'Rental, deposit, pickup, return and damage terms.' },
    ],
  },
];

export const clientSourceMap = [
  { section: 'Branding', clientSource: 'client/src/components/LuxuryHeader.tsx, client/src/app/layout.tsx', settings: 'brandingJson, navigationJson, seoJson' },
  { section: 'Homepage', clientSource: 'client/src/app/page.tsx, CinematicHero, EditorialSection', settings: 'homepageJson, brandingJson' },
  { section: 'Catalog', clientSource: 'client/src/app/products/page.tsx, FilterBar, ProductCard', settings: 'catalogJson' },
  { section: 'Product detail', clientSource: 'client/src/app/products/[id]/page.tsx, GalleryModal, TryOnDemo', settings: 'productDetailJson, previewJson' },
  { section: 'Inquiry checkout', clientSource: 'client/src/app/checkout/page.tsx, InquiryCheckout', settings: 'inquiryJson, policiesJson' },
  { section: 'AI preview', clientSource: 'client/src/app/products/[id]/preview/page.tsx, TryOnDemo', settings: 'previewJson' },
  { section: 'Footer and locale copy', clientSource: 'client/src/components/client/Footer.tsx, client/src/locales/*', settings: 'footerJson, i18nJson' },
];
