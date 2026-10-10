# Phạm vi MVP — Nền tảng du lịch cộng đồng

Cập nhật: 10/10/2026. Trạng thái: phạm vi đã chốt để thiết kế và triển khai, chưa phải báo cáo chức năng đã hoàn thành.

Tài liệu này tóm tắt phạm vi sản phẩm. Quy tắc đầy đủ nằm trong [Đặc tả nghiệp vụ](../docs/business-requirements.md); cách kiểm chứng nằm trong [34 kịch bản nghiệm thu](../docs/acceptance-scenarios.md). Task triển khai được quản lý trên Jira Cloud.

Bản chốt thiết kế gồm [Kiến trúc hệ thống](ARCHITECTURE.md) và [Use case](USE_CASES.md). MVP xác định có/không làm; đặc tả xác định quy tắc; kiến trúc xác định cách chia trách nhiệm; use case xác định actor và kết quả cần đạt. Thay đổi phạm vi phải cập nhật đồng bộ các tài liệu này, không suy phạm vi mới từ một màn hình hoặc bảng database.

## 1. Mục tiêu sản phẩm

Kết nối khách du lịch với hộ dân cung cấp lưu trú, dịch vụ và trải nghiệm du lịch cộng đồng; đồng thời giúp hộ quản lý lịch phục vụ, tài nguyên, yêu cầu đặt và thu chi. Admin quản trị và kiểm duyệt nền tảng.

Hộ không bắt buộc có phòng hoặc homestay. Khách có thể chỉ đặt phòng, chỉ đặt trải nghiệm hoặc kết hợp. Một booking luôn thuộc đúng một hộ dân.

## 2. Người dùng

| Đối tượng | Chức năng trong MVP |
| --- | --- |
| Khách chưa đăng nhập | Tìm kiếm, xem thông tin công khai, giá/lịch và liên hệ hộ qua điện thoại hoặc Zalo. |
| CUSTOMER | Đặt dịch vụ, yêu cầu lịch riêng, chấp nhận phương án, hủy và theo dõi đơn của mình; xem tiền hộ đã ghi nhận; gửi phiếu hỏi sản phẩm, đánh giá hợp lệ và phản ánh. |
| HOUSEHOLD | Có toàn bộ chức năng CUSTOMER để đặt hộ khác bằng cùng tài khoản; quản lý dữ liệu của hộ mình sở hữu. |
| ADMIN | Duyệt hộ và nội dung; quản lý tài khoản, danh mục, phản ánh; xem hoạt động và thống kê. Không xác nhận/hủy booking hoặc thu/hoàn tiền thay hộ. |

Mỗi hộ có một chủ quản lý trong MVP. Quyền sở hữu được kiểm tra ở backend trên từng đối tượng; biết mã booking hoặc có vai trò HOUSEHOLD không cho phép truy cập dữ liệu quản lý của hộ khác.

Chốt kênh sử dụng: một ứng dụng Flutter Android có khu vực Khách và khu vực Chủ hộ; một web React dành cho Admin; một backend Express chia sáu module dùng chung MySQL. iOS, Flutter Web và website riêng dành cho khách chưa thuộc lần phát hành MVP này.

## 3. Chức năng phải có

| Nhóm | Phạm vi nghiệm thu |
| --- | --- |
| Tài khoản và hộ dân | Đăng ký/đăng nhập, chức năng theo quyền, đăng ký tham gia, duyệt/từ chối/thu hồi duyệt hộ, khóa tài khoản. |
| Lưu trú | Hồ sơ phòng, ảnh/mô tả, giá theo đêm, số khách tối đa, lịch phòng và lịch chặn. |
| Dịch vụ và trải nghiệm | Danh mục, nội dung, điều kiện tham gia, lịch, thời lượng, sức chứa; giá theo người/nhóm/chuyến hoặc gói/giờ/đơn vị; phương án ghép hoặc thuê riêng. |
| Tài nguyên | Khai báo tài nguyên đơn chiếc hoặc theo số lượng, phân công thủ công cho lịch, ngăn trùng và kiểm tra hạn mức từng booking. |
| Đặt dịch vụ | Ba luồng đặt, một hộ mỗi booking, giữ chỗ có hạn, xác nhận/từ chối, hủy toàn đơn, lưu giá và điều kiện đã chốt. |
| Kết quả phục vụ | Ghi kết quả từng phòng/dịch vụ, phần đã/chưa phục vụ và lý do; tổng hợp hoàn thành, khách vắng mặt hoặc gián đoạn. |
| Thu chi thủ công | Ghi thu, cọc, khoản hoàn đã thống nhất, thực hoàn nhiều lần, thu khác, chi phí và điều chỉnh có dấu vết. |
| Nội dung cộng đồng | Sản phẩm theo mùa, bài văn hóa; duyệt nội dung mới và bản sửa, giữ bản cũ tiếp tục công khai. |
| Sau giao dịch | Đánh giá tổng thể cho đơn hoàn thành, phản ánh, thông báo trong ứng dụng và báo cáo cơ bản. |

## 4. Ba luồng đặt bắt buộc

### A. Chọn lịch mở sẵn

Khách chọn phòng/dịch vụ → hệ thống kiểm tra và giữ toàn bộ chỗ → booking PENDING → hộ xác nhận thành CONFIRMED hoặc từ chối.

Nếu một hạng mục không đáp ứng được, toàn bộ thao tác tạo đơn phải hoàn tác; không giữ sót phòng hoặc tài nguyên.

### B. Yêu cầu lịch riêng

CustomScheduleRequest → Proposal → ProposalHold → Booking.

Yêu cầu ban đầu chưa tạo booking hoặc giữ chỗ. Hộ gửi phương án cụ thể có lịch, giá, tài nguyên và điều kiện; hệ thống giữ chỗ có hạn. Khách chấp nhận đúng phiên bản còn hiệu lực thì tạo booking CONFIRMED, không cần hộ xác nhận lại.

Mỗi yêu cầu có tối đa một phương án đang hiệu lực. Sửa phương án thay giữ chỗ nguyên tử; thất bại giữ nguyên phương án cũ. Không tự gia hạn khi sửa, không nhận bản đã bị thay thế và không trừ chỗ hai lần khi chuyển thành booking.

### C. Khách đặt ngoài ứng dụng

Hộ nhập khách và hạng mục → kiểm tra khả dụng → tạo booking CONFIRMED.

Dùng chung kiểm tra với đơn online; không được bỏ qua giữ chỗ của khách khác. Lưu nguồn đặt và liên hệ, không tạo tài khoản khách giả hoặc quyền đánh giá từ đơn ngoài ứng dụng.

“Khách ngoài ứng dụng” là nguồn khách qua điện thoại/trực tiếp. Hộ vẫn cần kết nối hệ thống để nhập và giữ chỗ; không phải chế độ tạo đơn khi thiết bị mất mạng rồi đồng bộ sau.

## 5. Quy tắc không được giản lược

### Giá, người và tài nguyên

- `participantCount`: số người thực tế tham gia.
- `quantity`: số đơn vị tính tiền theo cách bán.
- `resourceUsages`: mức dùng từng tài nguyên của hạng mục hoặc giữ chỗ.

Ba đại lượng được xác định riêng nhưng phải đáp ứng các quan hệ đã cấu hình. Một nhóm năm người tính tiền một nhóm vẫn chiếm năm chỗ. Thuê ba xe phải giữ ba xe. Một thuyền tối đa sáu người không thể nhận mười người dù tổng sức chứa của lịch còn đủ.

Giá theo giờ do backend tính từ thời lượng, với phạm vi tài nguyên chính cố định. Giá theo đơn vị áp dụng cho trọn lịch đã chọn. Backend tính giá và lưu bản chụp thông tin giao dịch; đổi giá hiện tại không làm đổi đơn cũ.

### Tài nguyên hai cấp

**Hộ → lịch:** ResourceAssignment dành tài nguyên khi mở lịch, kể cả chưa có khách. Với tài nguyên theo số lượng, kiểm tra tổng được phân đồng thời tại từng thời điểm; không cộng máy móc mọi lịch giao nhau. Khoảng thời gian là [bắt đầu, kết thúc).

**Lịch → booking:** Tài nguyên dùng chung cho cả chuyến chỉ dành một lần. Tài nguyên chia theo booking như xe đạp được trừ trong hạn mức đã phân cho lịch. Không cộng lượng booking dùng thêm lần nữa vào phân công cấp hộ.

Booking/hold ghép phải đồng thời đủ người, đủ mọi tài nguyên và không xung đột thuê riêng. Thuê riêng chặn toàn lịch dù đoàn chưa dùng hết chỗ. Lịch đóng nhận khách nhưng còn nghĩa vụ phục vụ vẫn giữ tài nguyên. Hủy một booking không giải phóng phần của khách khác.

### Giữ chỗ và thời gian

Hạn giữ là thời điểm sớm hơn giữa lúc bắt đầu giữ + 24 giờ và thời điểm sử dụng đầu tiên − 2 giờ. Chỉ tạo/gửi giữ chỗ khi còn ít nhất 30 phút phản hồi. Hết hạn phải trả khả dụng ngay dù tác vụ nền chưa chạy. Hạn chờ này không áp dụng cho booking ngoài ứng dụng được xác nhận ngay.

Dịch vụ có thể nằm ngoài kỳ lưu trú; hiển thị từng lịch rõ ràng. Hạn giữ/hủy lấy thời điểm bắt đầu sớm nhất, hoàn thành đầy đủ lấy thời điểm kết thúc muộn nhất. Các phòng trong một booking dùng chung kỳ lưu trú. Phòng tính giá theo đêm nhưng chống trùng theo cả ngày và giờ nhận/trả đã lưu.

Khi lịch còn cam kết hiệu lực, không sửa giờ, sức chứa, phân công hoặc quy tắc tài nguyên bằng thao tác thông thường. Hộ được đóng nhận đặt mới và tiếp tục phục vụ đơn cũ.

### Hủy, kết quả và tiền

Trước hạng mục đầu tiên, khách hủy toàn đơn ngay; hộ hủy phải có lý do. Sau khi bắt đầu, dùng quy trình kết quả/ngoại lệ, không hủy thông thường.

| Kết quả từng hạng mục | Kết quả toàn booking |
| --- | --- |
| Tất cả SERVED và thời gian phục vụ đã kết thúc | COMPLETED |
| Tất cả NOT_SERVED vì khách vắng mặt, sau khi hết thời gian sử dụng | NO_SHOW |
| Có phần không hoàn thành vì thời tiết, hộ không thể phục vụ hoặc đã dùng một phần | INTERRUPTED khi mọi hạng mục đã được kết luận |
| Còn hạng mục chưa kết luận | Chưa chốt kết quả toàn đơn |

Hạng mục dùng một phần có kết quả PARTIALLY_SERVED và phải ghi phần đã/chưa phục vụ cùng lý do. Đã ở phòng nhưng không bắt cá vì mưa là INTERRUPTED. Booking đã hủy trước lúc bắt đầu vẫn là CANCELLED.

Hủy hoặc ghi kết quả không tự ghi hoàn tiền. Cọc là một khoản thu, không cộng lần nữa khi tổng hợp. Tách tiền thực thu, khoản hoàn đã thống nhất và thực hoàn. Đơn đã hủy vẫn có thể còn chờ hoàn tiền.

### Kiểm duyệt và thu hồi duyệt hộ

Giữ bản đã duyệt công khai trong khi bản sửa nội dung chờ Admin. Hộ tự cập nhật giá và tình trạng vận hành trong giới hạn cam kết hiện có. Admin ẩn vi phạm có lý do; hộ không tự mở lại nội dung đã bị ẩn.

Thu hồi duyệt hộ dừng cam kết mới, kết thúc đơn chờ/yêu cầu chưa chuyển thành booking, vô hiệu hóa phương án và trả giữ chỗ. Đơn đã xác nhận và tài nguyên phục vụ chúng được giữ. Tài khoản còn hoạt động vẫn xử lý đơn cũ, ghi thu/hoàn, xem lịch sử và dùng chức năng khách đặt hộ khác. Duyệt lại không tự khôi phục yêu cầu đã kết thúc.

## 6. Sản phẩm, văn hóa và sau giao dịch

Sản phẩm địa phương có ảnh, mô tả, nguồn gốc, mùa vụ, giá tham khảo hoặc “Liên hệ hộ dân”; trạng thái Đang có hàng, Sắp vào mùa, Tạm hết hàng, Ngừng cung cấp. Khách liên hệ qua điện thoại/Zalo hoặc phiếu hỏi trên nền tảng. Phiếu hỏi không giữ hàng, không bảo đảm nguồn hàng và không tạo đơn mua.

Hộ gửi bài văn hóa để Admin duyệt; Admin có thể đăng bài chung. Nội dung chung thuộc nền tảng, không cần gán một hộ giả.

Khách có tài khoản được viết một đánh giá tổng thể cho booking COMPLETED của mình. Các trường hợp khác có thể gửi phản ánh. Hộ không sửa/xóa đánh giá của khách; Admin xử lý vi phạm có dấu vết.

Thông báo trong ứng dụng hỗ trợ yêu cầu mới, phương án, xác nhận, từ chối, hủy, hết hạn và kiểm duyệt. Báo cáo tách giá trị booking, giá trị đơn hoàn thành, thực thu, thực hoàn, khoản tiền còn phải xử lý, thu khác và chi phí; không gọi tổng giá trị đơn là tiền đã thu hoặc chênh lệch thu–chi là lợi nhuận kế toán.

## 7. Chưa làm trong MVP

- Một booking nhiều hộ; sửa/hủy riêng từng hạng mục sau xác nhận theo quy trình thông thường.
- Giỏ hàng, đơn mua sản phẩm, tồn kho hàng hóa chính xác, vận chuyển hoặc logistics.
- Cổng thanh toán, xác minh chuyển khoản tự động, nền tảng giữ tiền/thu hoa hồng.
- Chat realtime và push notification.
- Thuật toán tự xếp lịch, tự tối ưu phân công nhân lực hoặc tài nguyên.
- Combo nhiều dịch vụ có cơ chế bán riêng; công thức giá tùy biến; tự tính phí hủy.
- Nhiều tài khoản thành viên quản lý cùng hộ hoặc phân quyền nhân viên chi tiết.
- Chế độ giao dịch khi mất mạng; tìm kiếm bản đồ/khoảng cách hoặc gợi ý lịch trình tự động.

Gói cố định trong một dịch vụ và phụ phí không cần giữ tài nguyên riêng vẫn được làm. Giới hạn này không loại bỏ các hạng mục phòng/dịch vụ độc lập trong cùng booking của một hộ.

### Ranh giới phát hành đã chốt

| Phần bắt buộc trong MVP | Mức đơn giản hóa được phép | Phần chưa làm |
| --- | --- | --- |
| Ba luồng đặt đầy đủ | Giao diện form/list, chọn tài nguyên thủ công | Tự tối ưu lịch, thay Request/Proposal bằng ghi chú trong booking |
| Tài nguyên hai cấp và bán ghép/thuê riêng | Một backend/database, khóa theo hộ trong transaction | Dùng kiểm tra UI thay khóa database, bỏ kiểm tra tài nguyên ở lúc mở lịch |
| Duyệt bản mới và bản sửa | Danh sách duyệt và xem hai phiên bản | Tự xuất bản bản sửa khi chưa duyệt |
| Kết quả từng hạng mục và thu/hoàn thủ công | Ghi lý do, phần đã/chưa phục vụ, các lần tiền thực tế | Tự tính phí hủy, hoàn tiền tự động, hủy một phần đơn qua quy trình thường |
| Sản phẩm theo mùa và liên hệ | Ảnh/mô tả, trạng thái cung ứng, phiếu hỏi | Tồn kho hàng hóa, giỏ hàng, đơn mua, vận chuyển |
| Thông báo và thống kê cơ bản | Thông báo trong app, bảng số liệu theo quyền | Push, chat, phân tích dự báo hoặc dashboard phức tạp |

Thứ tự phát triển không phải chia lại phạm vi: hoàn thành luồng lịch sẵn trước là một mốc kỹ thuật; chưa được gọi là MVP hoàn chỉnh nếu còn thiếu lịch riêng, tài nguyên dùng chung hoặc các phần bắt buộc khác.

## 8. Điều kiện nghiệm thu MVP

MVP chỉ được coi là hoàn thành khi các chức năng trên đã được triển khai và kiểm chứng, không phải khi chỉ có tài liệu hoặc giao diện minh họa.

- Hộ không có phòng vẫn cung cấp trải nghiệm; tài khoản chủ hộ đặt được hộ khác và không truy cập được dữ liệu quản lý của hộ đó.
- Ba luồng đặt chạy đầy đủ; đặt kết hợp nguyên tử và chỉ thuộc một hộ.
- Không phân trùng tài nguyên khi mở lịch; không vượt số người, số tài nguyên hoặc quyền độc quyền khi đặt đồng thời.
- Sửa/chấp nhận/hết hạn phương án và thu hồi duyệt xử lý an toàn trong transaction MySQL thật; không giữ chỗ hai lần.
- Hủy, kết quả từng hạng mục, thu/hoàn và lịch sử phản ánh đúng thực tế, không tự chuyển trạng thái tiền sai.
- Kiểm duyệt bảo toàn bản công khai và snapshot giao dịch; sản phẩm chỉ giới thiệu/liên hệ.
- Chạy và lưu bằng chứng cho toàn bộ [34 kịch bản nghiệm thu](../docs/acceptance-scenarios.md), bao gồm các ca đồng thời, rollback, gửi lại thao tác và kiểm tra quyền ở backend.

Mặc định kỹ thuật: Express/MySQL, React Admin, Flutter cho khách/hộ; VND; múi giờ Asia/Ho_Chi_Minh; phòng theo đêm, giờ nhận/trả mặc định 14:00/12:00. Backend tổ chức theo sáu miền nghiệp vụ, chưa tách microservices. Thiết kế database/API phải theo [đặc tả đầy đủ](../docs/business-requirements.md), đặc biệt hai cấp tài nguyên, vòng đời phương án riêng và kết quả từng hạng mục.
