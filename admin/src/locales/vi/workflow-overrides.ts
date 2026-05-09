export const workflowOverrides = {
  lead: {
    next_step: {
      reserve_inventory: 'Xử lý lại trạng thái sản phẩm',
    },
    deposit: {
      reserve_failed: 'Đã nhận cọc nhưng chưa giữ được toàn bộ sản phẩm. Cần đổi sản phẩm, bỏ sản phẩm lỗi hoặc hoàn cọc.',
      appointment_failed: 'Đã giữ sản phẩm nhưng chưa tạo được lịch hẹn. Hãy tạo lại lịch hẹn trước khi tiếp tục.',
      custom_amount: 'Số cọc nhập tay',
      required: 'Số tiền cần cọc theo cấu hình hiện tại.',
      paid: 'Số tiền cọc tài sản đã thu từ khách.',
    },
    booking: {
      reserveRequired: 'Có sản phẩm chưa sẵn sàng để tạo đơn thuê.',
      reserveRequiredHelper: 'Chỉ tạo đơn thuê khi các sản phẩm trong lead đã được giữ thành công.',
    },
  },
  leadOps: {
    fallback: {
      overdue: 'quá hạn',
      fallbackRequest: 'Nhu cầu thuê chưa có mô tả',
    },
    deposit: {
      rule: 'Chính sách cọc lead: sản phẩm đến 300.000đ không cần cọc; trên 300.000đ đến dưới 1.000.000đ thu 500.000đ hoặc giữ giấy tờ; từ 1.000.000đ trở lên thu 1.000.000đ hoặc 500.000đ kèm giấy tờ.',
      policyTitle: 'Chính sách cọc',
      productValueHelper: 'Cơ sở tính cọc tài sản theo tổng giá trị sản phẩm.',
      rentalValueHelper: 'Tổng đơn giá thuê của toàn bộ sản phẩm đã chọn.',
      previewMetricHelper: 'Tự tính ngay theo chính sách cọc của tổng giá trị sản phẩm đang chọn.',
      previewActive: 'Cọc giữ lịch đang preview theo chính sách lead: {policy} cho tổng giá trị sản phẩm {productValue}. Số tiền mặt hiện tại: {amount}.',
      previewPending: 'Đã tính tạm cọc theo chính sách lead. Số tiền mặt hiện tại: {amount}.',
      previewBeforeSave: 'Preview cọc giữ lịch trước khi lưu lựa chọn sản phẩm.',
      previewNeedsDates: 'Chọn thêm ngày thuê để hoàn tất preview giữ lịch.',
      documentNote: 'Nếu chọn phương án có giấy tờ, ghi rõ loại giấy tờ đang giữ trong ghi chú thanh toán.',
      noteHelper: 'Ghi ngắn gọn kênh thu, thu ngân hoặc mã tham chiếu giao dịch.',
      policyLabel: {
        none: 'Không cần cọc',
        mid: '500.000đ hoặc giấy tờ',
        high: '1.000.000đ hoặc 500.000đ + giấy tờ',
      },
      policyHelper: {
        none: 'Sản phẩm có giá trị từ 300.000đ trở xuống không cần cọc.',
        mid: 'Sản phẩm trên 300.000đ đến dưới 1.000.000đ: thu 500.000đ hoặc giữ giấy tờ tùy thân.',
        high: 'Sản phẩm từ 1.000.000đ trở lên: thu 1.000.000đ hoặc thu 500.000đ kèm giấy tờ tùy thân.',
      },
      option: {
        no_deposit: 'Không cần cọc',
        cash_500k: '500.000đ tiền mặt',
        document_only: 'Giấy tờ tùy thân',
        cash_1m: '1.000.000đ tiền mặt',
        cash_500k_with_document: '500.000đ + giấy tờ',
      },
      optionHelper: {
        no_deposit: 'Xác nhận trực tiếp để tiếp tục flow lead, không cần thu tiền cọc.',
        cash_500k: 'Thu 500.000đ tiền mặt theo chính sách lead.',
        document_only: 'Không thu tiền mặt. Ghi rõ loại giấy tờ đang giữ trong ghi chú thanh toán.',
        cash_1m: 'Thu đủ 1.000.000đ tiền mặt.',
        cash_500k_with_document: 'Thu 500.000đ và ghi rõ giấy tờ tùy thân đi kèm trong ghi chú thanh toán.',
      },
    },
    ui: {
      leadCockpit: 'Điều phối lead',
      manual: 'Nhập tay',
      owner: 'Phụ trách',
      ownerHelper: 'Nhân viên đang theo lead này',
      quoted: 'Giá báo',
      quotedHelper: 'Tổng giá trị thương mại đang báo cho khách',
      depositPaid: 'Đã cọc',
      depositPaidHelper: 'Số tiền cọc tài sản đã thu',
      depositRequired: 'Cần cọc',
      depositRequiredHelper: 'Số tiền cần thu theo mức cọc hiện tại',
      locked: 'Đã khóa',
      rentalInfoTitle: 'Thông tin thuê',
      rentalInfoDescription: 'Quản lý thời gian thuê, ý định lịch hẹn và ghi chú vận hành cho toàn bộ sản phẩm trong lead.',
      rentalWindow: 'Khung thời gian thuê',
      nextBestAction: 'Bước tiếp theo',
      recommended: 'Khuyến nghị',
      primaryActions: 'Hành động chính',
      secondaryActions: 'Tác vụ phụ',
      dangerZone: 'Cảnh báo',
      noteSnapshot: 'Ảnh chụp nhanh ghi chú vận hành',
      cashierIntake: 'Chọn đúng phương án cọc theo chính sách lead và ghi rõ giấy tờ đi kèm nếu không thu đủ tiền mặt.',
      commercialEdit: 'Điều chỉnh ghi chú nội bộ và giá báo mà không thay đổi luồng vận hành.',
      commercialEditDescription: 'Chỉ cập nhật nội dung phục vụ điều phối sales và tư vấn.',
      commercialPriceHelper: 'Hiển thị theo VND, lưu dưới dạng số tiền thuần.',
      commercialNoteHelper: 'Giữ ghi chú ngắn gọn và tập trung vào việc người xử lý tiếp theo cần biết.',
    },
  },
  leadUi: {
    moneyInputPlaceholder: 'Nhập số tiền',
    emptyColors: 'Chưa có màu khả dụng cho sản phẩm này.',
    emptySizes: 'Chưa có size khả dụng cho sản phẩm này.',
    changeProduct: 'Đổi món đồ',
    productTitle: 'Món đồ thuê',
    productModalTitle: 'Chọn món đồ',
    selectedProduct: 'Sản phẩm đã chọn',
    rentalPrice: 'Giá thuê',
    productValue: 'Giá trị sản phẩm',
    emptySelectionTitle: 'Chưa có sản phẩm được chọn',
    emptySelectionDescription: 'Mở danh sách sản phẩm và chọn đúng món khách đang hỏi thuê.',
    searchPlaceholder: 'Tìm theo tên sản phẩm',
    noResultsTitle: 'Không tìm thấy sản phẩm phù hợp',
    noResultsDescription: 'Thử từ khóa khác để tìm đúng sản phẩm khách đang hỏi thuê.',
  },
  leadFlow: {
    stepDesc: {
      selectProduct: 'Gắn danh sách sản phẩm khách muốn thuê, ngày lấy/trả và ý định lịch hẹn vào lead. Không yêu cầu chọn item hay variant riêng.',
      receiveDeposit: 'Thu cọc tài sản, tạo payment security_deposit và giữ toàn bộ sản phẩm còn trống lịch trước khi tự tạo lịch hẹn.',
    },
    helper: {
      autoReserve: 'Sau bước này hệ thống sẽ giữ toàn bộ sản phẩm trong lead nếu còn trống lịch.',
      productOnlySelection: 'Chọn sản phẩm khách muốn thuê. Lead này chỉ theo dõi theo sản phẩm, không gắn item kho.',
      bookingAnchor: 'Mã đơn thuê là điểm neo để chuyển sang thanh toán, bàn giao và nhận trả.',
      bookingLifecycle: 'Trạng thái vòng đời sau khi lead đã chuyển thành đơn thuê.',
    },
    form: {
      product: 'Sản phẩm',
    },
  },
  themeSwitcher: {
    open: 'Mở bộ chọn giao diện',
    tenant: 'Tenant',
    title: 'Giao diện',
    tenantLocked: 'Tenant đang khóa giao diện mặc định cho toàn bộ người dùng.',
    tenantConfigurable: 'Tenant đã cấu hình giao diện mặc định, nhưng vẫn cho phép cá nhân tự chọn.',
    mode: {
      light: 'Sáng',
      dark: 'Tối',
    },
    current: 'Đang dùng',
  },
  payment: {
    title: 'Thanh toán',
    subtitle: 'Quản lý cọc tài sản, tiền thuê, phí phát sinh và hoàn tiền theo đơn thuê từ một workspace thống nhất.',
    context: {
      lead_deposit: 'Cọc từ lead đã chuyển sang đơn thuê',
      booking_payment: 'Dòng tiền của đơn thuê',
    },
    summary: {
      booking_deposit_paid: 'Cọc tài sản đã thu',
      security_deposit_required: 'Cọc cần đủ trước khi bàn giao',
      amount_due_now: 'Tổng cần thu hiện tại',
    },
    actions: {
      refund_deposit: 'Hoàn cọc tài sản',
    },
    products: {
      title: 'Sản phẩm trong đơn',
    },
    deposit: {
      custom_amount: 'Số cọc nhập tay',
    },
  },
  paymentOps: {
    subtitle: 'Theo dõi cọc tài sản, tiền thuê, phí và hoàn tiền theo đơn thuê. Không trộn cọc với tiền thuê.',
    next: {
      collectDeposit: 'Thu phần cọc tài sản còn thiếu.',
    },
    queue: {
      description: 'Danh sách đơn thuê đang chờ thu cọc tài sản, tiền thuê hoặc hoàn tất điều kiện trước bàn giao.',
    },
    workspace: {
      description: 'Chọn khoản cần thu và ghi nhận append-only vào sổ payment của đơn thuê.',
      breakdown: 'Các khoản cọc, tiền thuê, phí và hoàn tiền được tách riêng để đối soát rõ ràng.',
    },
    breakdown: {
      description: 'Mọi con số đều lấy từ payment summary backend: tổng giá trị sản phẩm, cọc, tiền thuê, phí và hoàn tiền.',
      booking_deposit: 'Cọc tài sản đã nhận từ lead',
    },
    context: {
      description: 'Thanh toán bám theo một đơn thuê duy nhất để tránh nhầm cọc tài sản với tiền thuê.',
      product: 'Sản phẩm',
    },
    validation: {
      bookingDepositAtLead: 'Cọc tài sản phát sinh từ lead đã được chuyển sang đơn thuê. Không thu lặp lại như một loại cọc khác.',
      depositPaid: 'Cọc tài sản đã đủ theo cấu hình hiện tại.',
      securityPaid: 'Cọc tài sản đã đủ trước khi bàn giao.',
    },
  },
  pickup: {
    title: 'Quầy bàn giao',
    subtitle: 'Bàn giao theo đơn thuê với checklist sản phẩm, trạng thái thanh toán và 4 ảnh hiện trạng bắt buộc.',
    queue: {
      description: 'Chỉ hiển thị đơn thuê đang chờ bàn giao và còn thiếu bước xác nhận hiện trạng.',
      ready_helper: 'Tải đủ 4 ảnh bàn giao rồi xác nhận.',
      expected_items: 'sản phẩm',
    },
    validation: {
      missing_payment: 'Đơn thuê vẫn còn khoản phải thu hoặc thiếu cọc tài sản. Mở quầy thanh toán trước khi bàn giao.',
    },
    context: {
      expected_item: 'Sản phẩm cần bàn giao',
    },
    blocked: {
      unpaid: 'Chưa thu đủ tiền thuê theo rule hiện tại để bàn giao.',
      deposit_missing: 'Chưa đủ cọc tài sản để bàn giao.',
    },
    feedback: {
      confirmed: 'Đã xác nhận bàn giao, lưu ảnh hiện trạng và cập nhật trạng thái sản phẩm.',
    },
  },
  pickupOps: {
    subtitle: 'Bàn giao theo đơn thuê đã xác nhận. Nhân viên kiểm tra điều kiện thanh toán, chụp đủ 4 ảnh hiện trạng và xác nhận giao đồ mà không cần quét QR.',
    next: {
      scanMissing: 'Hoàn tất đủ 4 ảnh bàn giao.',
    },
    stats: {
      collectDetail: 'Cọc tài sản còn thiếu cộng tiền thuê chưa thanh toán',
    },
    workspace: {
      title: 'Không gian bàn giao',
    },
  },
} as const;
