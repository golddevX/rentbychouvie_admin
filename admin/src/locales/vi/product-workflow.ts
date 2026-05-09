export const productWorkflow = {
  product: {
    value: 'Giá trị sản phẩm',
    rental_price: 'Giá thuê',
    scan: {
      title: 'Quét sản phẩm',
      quick_lead: 'Tạo lead nhanh',
    },
    availability: {
      title: 'Lịch trống',
      available: 'Có thể cho thuê',
      unavailable: 'Không trống lịch',
      next_available: 'Ngày trống gần nhất',
    },
    status: {
      available: 'Có sẵn',
      reserved: 'Đã giữ',
      rented: 'Đang thuê',
      maintenance: 'Bảo trì',
      damaged: 'Hư hỏng',
      retired: 'Ngưng cho thuê',
    },
  },
  qr: {
    title: 'Quét sản phẩm',
    placeholder: 'Nhập hoặc quét mã QR',
    result: {
      title: 'Thông tin sản phẩm',
    },
  },
  handover: {
    images: 'Ảnh bàn giao',
    confirm: 'Xác nhận bàn giao',
    image_front: 'Ảnh mặt trước sản phẩm',
    image_back: 'Ảnh mặt sau sản phẩm',
    image_accessory: 'Ảnh chi tiết / phụ kiện',
    image_overview: 'Ảnh tổng thể khi bàn giao',
  },
  paymentExtra: {
    custom_amount: 'Số cọc nhập tay',
  },
  returnExtra: {
    inspection_progress: 'Tiến độ kiểm tra',
    returned_product: 'Sản phẩm nhận trả',
    total_deductions: 'Tổng khấu trừ',
  },
} as const;
