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
    tagline: 'Đồ thuê dự tiệc theo lịch hẹn riêng',
    accentPreset: 'atelier green',
    heroImage: 'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?auto=format&fit=crop&w=2200&q=92',
  },
  homepageJson: {
    announcementEnabled: true,
    announcementText: 'Cuối tuần này còn lịch thử đồ riêng. Bạn nên đặt sớm nếu cần đồ đi tiệc hoặc dự cưới.',
    heroTitle: 'Mặc đẹp cho dịp thật đặc biệt.',
    heroSubtitle: 'Chọn mẫu bạn thích cho tiệc cưới, sự kiện hay buổi chụp hình. Shop sẽ hỗ trợ chốt lịch, thử đồ và tiền cọc rõ ràng.',
    ctaText: 'Khám phá bộ sưu tập',
    featuredSections: ['Mẫu mới lên kệ', 'Gợi ý đi tiệc cưới', 'Đầm dạ tiệc nổi bật'],
    editorialBlocks: [
      'Mỗi dịp đặc biệt đều xứng đáng với một bộ đồ thật vừa ý.',
      'Bạn cứ chọn mẫu trước, shop sẽ hỗ trợ chốt lịch và giữ đồ sau.',
    ],
  },
  catalogJson: {
    defaultSort: 'editorial',
    visibleFilters: ['Tìm kiếm', 'Danh mục', 'Ngày nhận', 'Ngày trả'],
    categoryOrder: ['Dress', 'Gown', 'Ao Dai', 'Vest'],
    showUnavailableItems: false,
    badgeLogic: 'Hiển thị giá thuê và nút xem thử AI trên thẻ sản phẩm.',
    quickActionsEnabled: true,
  },
  productDetailJson: {
    sectionOrder: ['Thư viện ảnh', 'Tóm tắt', 'Ngày thuê', 'Lưu ý thuê', 'Xem thử AI', 'Mẫu liên quan'],
    showStylistNote: true,
    showMeasurements: true,
    showFabrics: true,
    relatedProductsMode: 'same category',
    relatedProductsLimit: 4,
    rentalNoteBlock: 'Shop sẽ xác nhận lại tình trạng sản phẩm, lịch trống và buổi thử đồ trước khi chốt giữ mẫu.',
  },
  inquiryJson: {
    enabledFields: ['Tên', 'Số điện thoại', 'Email', 'Ghi chú phối đồ'],
    requiredFields: ['Tên', 'Số điện thoại', 'Email'],
    helperText: 'Chia sẻ ngày đi sự kiện, kiểu dáng bạn thích và khung giờ thuận tiện để shop tư vấn nhanh hơn.',
    trustBlock: ['Không thu tiền online ngay', 'Có thể thử đồ trước khi chốt'],
    pickupNote: 'Lịch nhận đồ sẽ được chốt sau khi xác nhận buổi thử hoặc lịch giao.',
    depositNote: 'Cọc tài sản chỉ thu sau khi shop xác nhận còn đồ và chốt được lịch thuê.',
    shippingNote: 'Nếu cần giao tận nơi, shop sẽ xác nhận riêng theo khu vực và thời gian.',
  },
  previewJson: {
    enabled: true,
    acceptedFileInfo: 'Ưu tiên ảnh chính diện, ánh sáng tự nhiên, định dạng JPG hoặc PNG.',
    disclaimer: 'Ảnh xem thử chỉ để tham khảo phom dáng, không thay thế buổi thử đồ thật.',
    reviewCopy: 'Stylist sẽ xem nhanh tổng thể phom, phần vai và độ cân đối của trang phục.',
    turnaroundNote: 'Phần lớn yêu cầu xem thử sẽ được phản hồi trong vòng 1 ngày làm việc.',
  },
  navigationJson: {
    topNavItems: [
      { label: 'Bộ sưu tập', href: '/products', visible: true },
      { label: 'Xem thử AI', href: '/products/demo/preview', visible: true },
      { label: 'Gửi yêu cầu', href: '/checkout', visible: true },
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
      { label: 'Chính sách thuê', href: '/policies/rental', visible: true },
      { label: 'Chính sách nhận trả', href: '/policies/returns', visible: true },
      { label: 'Liên hệ', href: '/checkout', visible: true },
    ],
  },
  seoJson: {
    siteTitleTemplate: '%s | ChouVie Rental Fashion',
    metaDescription: 'Website cho thuê thời trang cao cấp với lịch thử đồ riêng và xem thử AI.',
    ogImage: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=90',
  },
  i18nJson: {
    enabledLocales: ['vi', 'en'],
    defaultLocale: 'vi',
    fallbackLocale: 'vi',
  },
  policiesJson: {
    rentalPolicy: 'Lịch thuê được chốt theo tình trạng sản phẩm, buổi thử đồ và ngày bạn cần sử dụng.',
    depositPolicy: 'Cọc tài sản sẽ được thu sau khi xác nhận giữ mẫu và được hoàn lại sau khi shop kiểm tra lúc nhận trả.',
    pickupPolicy: 'Việc bàn giao được thực hiện sau khi đã xác nhận lịch và kiểm tra tình trạng sản phẩm.',
    returnPolicy: 'Vui lòng trả đồ đúng thời gian đã hẹn để tránh phát sinh phí trả trễ.',
    shippingPolicy: 'Giao tận nơi là lựa chọn linh hoạt và sẽ được shop xác nhận riêng theo từng trường hợp.',
    damagePolicy: 'Hư hỏng, thiếu phụ kiện hoặc cần vệ sinh chuyên sâu có thể được khấu trừ vào cọc tài sản.',
  },
  updatedBy: 'Hệ thống',
  updatedAt: '2026-04-23T09:30:00.000Z',
  publishedAt: '2026-04-22T17:45:00.000Z',
};

export const defaultClientSettingsVersions: ClientSettingsVersion[] = [
  {
    id: 'client-settings-v1',
    version: 1,
    label: 'Cấu hình website mặc định',
    status: 'published',
    settings: clientSettingsDefaults,
    createdBy: clientSettingsDefaults.updatedBy,
    createdAt: clientSettingsDefaults.publishedAt ?? clientSettingsDefaults.updatedAt,
    publishedAt: clientSettingsDefaults.publishedAt ?? clientSettingsDefaults.updatedAt,
    changedSections: ['branding', 'homepage', 'catalog', 'product-detail', 'inquiry', 'preview', 'navigation', 'footer', 'seo', 'i18n', 'policies'],
    note: 'Cấu hình mặc định cho website cho thuê thời trang cao cấp.',
  },
];

export const clientSettingsGroups: Array<{
  label: string;
  items: Array<{ slug: ClientSettingsSection; label: string; description: string }>;
}> = [
  {
    label: 'Giao diện khách hàng',
    items: [
      { slug: 'branding', label: 'Thương hiệu', description: 'Logo, màu chủ đạo và ảnh đại diện chính.' },
      { slug: 'homepage', label: 'Trang chủ', description: 'Hero, khối nội dung và thanh thông báo.' },
      { slug: 'catalog', label: 'Danh sách sản phẩm', description: 'Bộ lọc, cách sắp xếp và hành vi thẻ sản phẩm.' },
      { slug: 'product-detail', label: 'Chi tiết sản phẩm', description: 'Các khối hiển thị trên trang sản phẩm và lưu ý thuê.' },
    ],
  },
  {
    label: 'Chuyển đổi',
    items: [
      { slug: 'inquiry', label: 'Biểu mẫu yêu cầu thuê', description: 'Các trường thông tin, câu chữ tạo tin tưởng và ghi chú bàn giao.' },
      { slug: 'preview', label: 'Xem thử AI', description: 'Bật tắt tính năng, hướng dẫn tải ảnh và nội dung nhận xét.' },
    ],
  },
  {
    label: 'Cấu trúc',
    items: [
      { slug: 'navigation', label: 'Điều hướng', description: 'Nhãn menu trên cùng, thứ tự và trạng thái hiển thị.' },
      { slug: 'footer', label: 'Chân trang', description: 'Thông tin liên hệ, mạng xã hội và liên kết cuối trang.' },
    ],
  },
  {
    label: 'Thiết lập chung',
    items: [
      { slug: 'seo', label: 'SEO', description: 'Mẫu tiêu đề, mô tả và ảnh chia sẻ.' },
      { slug: 'i18n', label: 'Ngôn ngữ', description: 'Ngôn ngữ bật sẵn và ngôn ngữ dự phòng.' },
      { slug: 'policies', label: 'Chính sách', description: 'Điều khoản thuê, cọc, bàn giao, nhận trả và hư hỏng.' },
    ],
  },
];

export const clientSourceMap = [
  { section: 'Thương hiệu', clientSource: 'client/src/components/LuxuryHeader.tsx, client/src/app/layout.tsx', settings: 'brandingJson, navigationJson, seoJson' },
  { section: 'Trang chủ', clientSource: 'client/src/app/page.tsx, CinematicHero, EditorialSection', settings: 'homepageJson, brandingJson' },
  { section: 'Danh sách sản phẩm', clientSource: 'client/src/app/products/page.tsx, FilterBar, ProductCard', settings: 'catalogJson' },
  { section: 'Chi tiết sản phẩm', clientSource: 'client/src/app/products/[id]/page.tsx, GalleryModal, TryOnDemo', settings: 'productDetailJson, previewJson' },
  { section: 'Biểu mẫu yêu cầu thuê', clientSource: 'client/src/app/checkout/page.tsx, InquiryCheckout', settings: 'inquiryJson, policiesJson' },
  { section: 'Xem thử AI', clientSource: 'client/src/app/products/[id]/preview/page.tsx, TryOnDemo', settings: 'previewJson' },
  { section: 'Chân trang và ngôn ngữ', clientSource: 'client/src/components/client/Footer.tsx, client/src/locales/*', settings: 'footerJson, i18nJson' },
];
