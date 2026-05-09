import { common } from './common';
import { dashboard } from './dashboard';
import { lead } from './lead';
import { booking } from './booking';
import { payment } from './payment';
import { pickup } from './pickup';
import { returnMessages } from './return';
import { dispute } from './dispute';
import { settings } from './settings';
import { rbac } from './rbac';
import { clientSettings } from './client-settings';
import { rentalOrders } from './rental-orders';
import { productWorkflow } from './product-workflow';
import { workflowOverrides } from './workflow-overrides';

export const vi = {
  ...common,
  ...dashboard,
  ...lead,
  ...booking,
  ...payment,
  ...pickup,
  ...returnMessages,
  ...dispute,
  ...settings,
  ...rbac,
  ...clientSettings,
  ...rentalOrders,
  ...productWorkflow,
  common: {
    ...common.common,
    moreActions: 'Thao t\u00e1c kh\u00e1c',
    time: 'Thời gian',
    notes: 'Ghi chú',
  },
  nav: {
    ...common.nav,
    overviewGroup: 'Tổng quan',
    businessGroup: 'Kinh doanh',
    operationsGroup: 'Vận hành',
    adminGroup: 'Quản trị',
    users: 'Người dùng & phân quyền',
  },
  ui: {
    ...common.ui,
    topbarHint: 'Theo dõi các điểm chặn chính giữa lead, đơn thuê, thanh toán và bàn giao.',
    liveOps: 'Luồng đang theo dõi',
    nextPrefix: 'Tiếp theo',
    rowOpenHint: 'Chọn một dòng để mở chi tiết',
    commandHint: 'Mở nhanh màn hình hoặc thao tác',
  },
  shell: {
    brandTitle: 'Lumiere',
    brandSubtitle: 'Trung tâm vận hành',
    commandPlaceholder: 'Tìm màn hình, nghiệp vụ hoặc thao tác',
    commandEmpty: 'Không tìm thấy kết quả phù hợp',
    commandEmptyHint: 'Thử từ khóa khác hoặc mở màn hình từ thanh điều hướng.',
    commandOpen: 'Mở nhanh',
    commandClose: 'ESC để đóng',
    searchJump: 'Tìm hoặc chuyển nhanh',
    openSidebar: 'Mở thanh điều hướng',
    closeSidebar: 'Ẩn thanh điều hướng',
    expandSidebar: 'Mở rộng thanh điều hướng',
    collapseSidebar: 'Thu gọn thanh điều hướng',
    commandPalette: 'Mở tìm nhanh',
  },
  themeSwitcher: {
    ...workflowOverrides.themeSwitcher,
    mode: {
      ...workflowOverrides.themeSwitcher.mode,
    },
  },
  product: {
    ...productWorkflow.product,
  },
  qr: {
    ...productWorkflow.qr,
  },
  lead: {
    ...lead.lead,
    ...workflowOverrides.lead,
    products: {
      ...lead.lead.products,
    },
    deposit: {
      title: 'Cọc tài sản',
      rate: payment.payment.deposit.rate,
      custom_amount: productWorkflow.paymentExtra.custom_amount,
      required: payment.payment.deposit.required,
      paid: payment.payment.deposit.paid,
      remaining: payment.payment.deposit.remaining,
      ...lead.lead.deposit,
    },
  },
  leadOps: {
    ...lead.leadOps,
    ...workflowOverrides.leadOps,
    emptyDetail: 'L\u00e0m r\u00f5 b\u1ed9 l\u1ecdc ho\u1eb7c t\u1ea1o lead m\u1edbi \u0111\u1ec3 kh\u1edfi \u0111\u1ed9ng l\u1ea1i h\u00e0ng \u0111\u1ee3i v\u1eadn h\u00e0nh.',
    fallback: {
      ...lead.leadOps.fallback,
      ...workflowOverrides.leadOps.fallback,
    },
    deposit: {
      ...lead.leadOps.deposit,
      ...workflowOverrides.leadOps.deposit,
    },
    ui: {
      ...workflowOverrides.leadOps.ui,
    },
  },
  leadFlow: {
    ...lead.leadFlow,
    ...workflowOverrides.leadFlow,
    stepDesc: {
      ...lead.leadFlow.stepDesc,
      ...workflowOverrides.leadFlow.stepDesc,
    },
    helper: {
      ...lead.leadFlow.helper,
      ...workflowOverrides.leadFlow.helper,
    },
    form: {
      ...lead.leadFlow.form,
      ...workflowOverrides.leadFlow.form,
    },
  },
  leadUi: {
    ...workflowOverrides.leadUi,
  },
  appointmentOps: {
    ...lead.appointmentOps,
    detail: {
      ...lead.appointmentOps.detail,
      sourceBlock: 'Ngu\u1ed3n v\u1eadn h\u00e0nh',
      sourceBlockDesc: 'L\u1ecbch h\u1eb9n n\u00e0y \u0111i t\u1eeb lead ho\u1eb7c \u0111\u01a1n thu\u00ea, v\u00ec v\u1eady nh\u00e2n vi\u00ean lu\u00f4n th\u1ea5y \u0111\u01b0\u1ee3c \u0111i\u1ec3m b\u1eaft \u0111\u1ea7u c\u1ee7a workflow.',
      sourceLead: 'Lead ngu\u1ed3n',
      sourceBooking: '\u0110\u01a1n thu\u00ea ngu\u1ed3n',
      sourceFlow: 'V\u00f2ng \u0111\u1eddi',
      sourceFlowValue: 'Lead \u2192 L\u1ecbch h\u1eb9n \u2192 \u0110\u01a1n thu\u00ea',
      afterCompletion: 'Sau khi ho\u00e0n t\u1ea5t',
      afterCompletionDesc: 'M\u00e0n h\u00ecnh n\u00e0y lu\u00f4n ch\u1ec9 ra b\u01b0\u1edbc \u0111i ti\u1ebfp sau khi appointment \u0111\u01b0\u1ee3c x\u1eed l\u00fd xong.',
    },
    form: {
      ...lead.appointmentOps.form,
      defaultRoom: 'Ph\u00f2ng t\u01b0 v\u1ea5n A',
    },
  },
  payment: {
    ...payment.payment,
    ...workflowOverrides.payment,
    context: {
      ...payment.payment.context,
      ...workflowOverrides.payment.context,
    },
    summary: {
      ...payment.payment.summary,
      ...workflowOverrides.payment.summary,
    },
    actions: {
      ...payment.payment.actions,
      ...workflowOverrides.payment.actions,
    },
    products: {
      ...payment.payment.products,
      ...workflowOverrides.payment.products,
    },
    deposit: {
      ...payment.payment.deposit,
      ...workflowOverrides.payment.deposit,
    },
    rental: {
      ...payment.payment.rental,
    },
  },
  paymentOps: {
    ...payment.paymentOps,
    ...workflowOverrides.paymentOps,
    next: {
      ...payment.paymentOps.next,
      ...workflowOverrides.paymentOps.next,
    },
    queue: {
      ...payment.paymentOps.queue,
      ...workflowOverrides.paymentOps.queue,
    },
    workspace: {
      ...payment.paymentOps.workspace,
      ...workflowOverrides.paymentOps.workspace,
    },
    breakdown: {
      ...payment.paymentOps.breakdown,
      ...workflowOverrides.paymentOps.breakdown,
    },
    context: {
      ...payment.paymentOps.context,
      ...workflowOverrides.paymentOps.context,
    },
    validation: {
      ...payment.paymentOps.validation,
      ...workflowOverrides.paymentOps.validation,
    },
  },
  pickup: {
    ...pickup.pickup,
    ...workflowOverrides.pickup,
    queue: {
      ...pickup.pickup.queue,
      ...workflowOverrides.pickup.queue,
    },
    validation: {
      ...pickup.pickup.validation,
      ...workflowOverrides.pickup.validation,
    },
    context: {
      ...pickup.pickup.context,
      ...workflowOverrides.pickup.context,
    },
    blocked: {
      ...pickup.pickup.blocked,
      ...workflowOverrides.pickup.blocked,
    },
    feedback: {
      ...pickup.pickup.feedback,
      ...workflowOverrides.pickup.feedback,
    },
  },
  pickupOps: {
    ...pickup.pickupOps,
    ...workflowOverrides.pickupOps,
    next: {
      ...pickup.pickupOps.next,
      ...workflowOverrides.pickupOps.next,
    },
    stats: {
      ...pickup.pickupOps.stats,
      ...workflowOverrides.pickupOps.stats,
    },
    workspace: {
      ...pickup.pickupOps.workspace,
      ...workflowOverrides.pickupOps.workspace,
    },
  },
  booking: {
    ...booking.booking,
    products: {
      title: lead.lead.products.title,
    },
    handover: {
      images: productWorkflow.handover.images,
      confirm: productWorkflow.handover.confirm,
    },
  },
  return: {
    ...returnMessages.return,
    inspection: {
      ...returnMessages.return.inspection,
    },
    settlement: {
      ...returnMessages.return.settlement,
    },
  },
  scan: {
    ...settings.scan,
    qrCode: 'M\u00e3 QR',
  },
  audit: {
    create_lead_from_qr: 'Tạo lead từ QR',
    add_product_to_lead: 'Thêm sản phẩm vào lead',
    receive_deposit: 'Nhận cọc tài sản',
    create_booking_from_lead: 'Tạo đơn thuê từ lead',
    collect_rental_payment: 'Thu tiền thuê',
    confirm_handover: 'Xác nhận bàn giao',
    upload_handover_images: 'Tải ảnh bàn giao',
    return_inspection: 'Kiểm tra nhận trả',
    settlement_completed: 'Hoàn tất quyết toán',
    refund_issued: 'Đã hoàn tiền',
  },
} as const;

export type ViDictionary = typeof vi;
