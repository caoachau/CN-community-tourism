# Use case — Nền tảng du lịch cộng đồng

Ngày chốt: 10/10/2026. Phạm vi theo [MVP](MVP.md), kiến trúc theo [ARCHITECTURE](ARCHITECTURE.md). Quy tắc chi tiết nằm trong [Đặc tả nghiệp vụ](../docs/business-requirements.md); AC là mã trong [Kịch bản nghiệm thu](../docs/acceptance-scenarios.md).

Các use case dưới đây mô tả mục tiêu và kết quả cần xây dựng. Chúng không phải danh sách chức năng đã lập trình và không tạo/cập nhật task Jira.

## 1. Actor và ranh giới hệ thống

| Actor | Mục tiêu | Giới hạn |
| --- | --- | --- |
| Khách vãng lai | Tìm hiểu hộ, lịch, dịch vụ, sản phẩm và văn hóa; liên hệ ngoài nền tảng. | Là người chưa đăng nhập, không phải một vai trò quản trị mới; chưa được tạo giao dịch hoặc phiếu trên nền tảng. |
| CUSTOMER | Tìm, đặt và theo dõi dịch vụ của mình; chốt lịch riêng; đánh giá và phản ánh. | Chỉ thao tác dữ liệu của mình. |
| HOUSEHOLD | Cung cấp dịch vụ và quản lý hoạt động hộ mình; đồng thời sử dụng chức năng CUSTOMER ở hộ khác. | Một chủ quản lý một hộ trong MVP; phải xét sở hữu và trạng thái được phép nhận đặt. |
| ADMIN | Quản trị tài khoản, hộ, nội dung, danh mục, phản ánh và theo dõi hoạt động. | Không trở thành bên xác nhận/hủy booking hoặc thu/hoàn tiền thay hộ. |

Ba vai trò tài khoản chính là CUSTOMER, HOUSEHOLD và ADMIN. HOUSEHOLD kế thừa chức năng CUSTOMER; chuyển chế độ trên ứng dụng không tạo tài khoản thứ hai. Job hết hạn/thông báo là xử lý nội bộ hệ thống, không phải vai trò đăng nhập thứ tư.

Đăng nhập là tiền điều kiện của use case được bảo vệ, không phải một bước đăng nhập lại trong mọi luồng. Kiểm tra giá, khả dụng, quyền và chống trùng là xử lý bắt buộc bên trong use case tương ứng, không phải thao tác khách tự quyết định.

## 2. Danh mục use case trong MVP

Tất cả UC dưới đây thuộc MVP. Cột AC là các kịch bản liên quan, không đồng nghĩa một UC tương đương đúng một test hoặc các test đã chạy.

| Mã | Mục tiêu sử dụng | Actor chính | Module chính | Kịch bản liên quan |
| --- | --- | --- | --- | --- |
| UC-01 | Đăng ký, đăng nhập, đăng xuất và dùng đúng quyền tài khoản | Khách, CUSTOMER, HOUSEHOLD, ADMIN | identity | AC-01, AC-26, AC-27 |
| UC-02 | Tìm kiếm/lọc hộ, phòng và trải nghiệm | Khách, CUSTOMER, HOUSEHOLD | catalog | AC-18, AC-26, AC-29 |
| UC-03 | Xem chi tiết, giá/đơn vị, lịch, sản phẩm, văn hóa và đánh giá công khai | Khách, CUSTOMER, HOUSEHOLD | catalog | AC-11, AC-23, AC-28, AC-29, AC-31 |
| UC-04 | Đăng ký hộ và theo dõi kết quả xét duyệt | CUSTOMER, HOUSEHOLD | households | AC-26 |
| UC-05 | Quản lý hồ sơ hộ và gửi bản sửa nội dung | HOUSEHOLD | households, catalog | AC-28 |
| UC-06 | Đăng/quản lý phòng, giá theo đêm và điều kiện lưu trú | HOUSEHOLD | catalog | AC-17, AC-28, AC-33 |
| UC-07 | Đăng/quản lý dịch vụ, offer, giá, điều kiện và phụ phí hợp lệ | HOUSEHOLD | catalog | AC-13, AC-14, AC-15, AC-18, AC-25 |
| UC-08 | Khai báo và quản lý tài nguyên đơn chiếc/pool | HOUSEHOLD | availability | AC-02, AC-03, AC-14, AC-25 |
| UC-09 | Mở lịch và phân công tài nguyên thủ công | HOUSEHOLD | availability | AC-02, AC-03, AC-25 |
| UC-10 | Đóng nhận khách hoặc chặn lịch phòng | HOUSEHOLD | availability | AC-08, AC-17, AC-25 |
| UC-11 | Đặt phòng/dịch vụ từ lịch mở sẵn | CUSTOMER, HOUSEHOLD trong vai khách | booking | AC-01, AC-04, AC-05, AC-06, AC-16, AC-19, AC-34 |
| UC-12 | Xem chi tiết, lịch và lịch sử booking theo quyền | CUSTOMER, HOUSEHOLD; ADMIN chỉ xem | booking | AC-01, AC-11, AC-23, AC-33 |
| UC-13 | Xác nhận hoặc từ chối booking chờ | HOUSEHOLD | booking | AC-12, AC-24, AC-34 |
| UC-14 | Gửi yêu cầu tổ chức theo lịch riêng | CUSTOMER, HOUSEHOLD trong vai khách | booking | AC-20 |
| UC-15 | Lập, gửi và sửa phương án lịch riêng có giữ chỗ | HOUSEHOLD | booking | AC-07, AC-20, AC-21 |
| UC-16 | Chấp nhận, từ chối phương án hoặc rút yêu cầu lịch riêng | CUSTOMER, HOUSEHOLD trong vai khách | booking | AC-07, AC-21, AC-34 |
| UC-17 | Ghi nhận booking của khách liên hệ ngoài ứng dụng | HOUSEHOLD | booking | AC-22 |
| UC-18 | Hủy toàn booking trước khi bắt đầu | CUSTOMER, HOUSEHOLD | booking | AC-08, AC-10, AC-23, AC-24, AC-34 |
| UC-19 | Ghi nhận kết quả từng hạng mục và kết quả toàn đơn | HOUSEHOLD | aftercare | AC-09, AC-23 |
| UC-20 | Ghi thu/cọc, khoản hoàn thống nhất, thực hoàn và điều chỉnh | HOUSEHOLD | aftercare | AC-10, AC-30, AC-34 |
| UC-21 | Ghi thu khác, chi phí và điều chỉnh có dấu vết | HOUSEHOLD | aftercare | AC-30 |
| UC-22 | Xem thống kê theo phạm vi quyền | HOUSEHOLD, ADMIN | aftercare | AC-30, AC-33 |
| UC-23 | Đánh giá tổng thể một booking hoàn thành | CUSTOMER, HOUSEHOLD trong vai khách | aftercare | AC-31 |
| UC-24 | Giới thiệu sản phẩm địa phương và cập nhật tình trạng mùa vụ | HOUSEHOLD | catalog | AC-28, AC-29 |
| UC-25 | Gửi và tiếp nhận phiếu hỏi sản phẩm | CUSTOMER gửi, HOUSEHOLD tiếp nhận | catalog | AC-27, AC-29 |
| UC-26 | Gửi bài văn hóa hoặc đăng bài chung | HOUSEHOLD, ADMIN | catalog | AC-28 |
| UC-27 | Duyệt, từ chối hoặc thu hồi phê duyệt hộ | ADMIN | households | AC-07, AC-12, AC-26 |
| UC-28 | Duyệt bản nội dung mới/sửa, ẩn nội dung hoặc đánh giá vi phạm | ADMIN | catalog, aftercare | AC-11, AC-28, AC-31 |
| UC-29 | Quản lý trạng thái tài khoản | ADMIN | identity | AC-26, AC-27 |
| UC-30 | Quản lý danh mục dịch vụ và sản phẩm | ADMIN | catalog | AC-26, AC-28, AC-33 |
| UC-31 | Gửi phản ánh về thông tin/giao dịch | CUSTOMER, HOUSEHOLD trong vai khách | aftercare | AC-32 |
| UC-32 | Tiếp nhận và ghi kết quả xử lý phản ánh | ADMIN | aftercare | AC-27, AC-32 |
| UC-33 | Xem thông báo của tài khoản | CUSTOMER, HOUSEHOLD, ADMIN | dùng chung | AC-32 |
| UC-34 | Kết thúc giữ chỗ hết hạn và phát sinh thông báo tương ứng | Hệ thống tự động | booking, availability | AC-07, AC-08, AC-19 |

Tìm kiếm MVP dùng từ khóa, loại cung cấp/danh mục, địa phương và ngày/số khách khi có dữ liệu tương ứng. Giá phải đi kèm đơn vị, không so sánh giá một người với giá cả nhóm như cùng một đại lượng. Chưa có tìm kiếm bản đồ/khoảng cách, gợi ý cá nhân hóa hoặc công cụ tự ghép lịch trình.

## 3. Đặc tả các use case giao dịch chính

### UC-09 — Mở lịch và phân công tài nguyên

**Tiền điều kiện:** Hộ thuộc người thao tác, được phép nhận đặt; dịch vụ và tài nguyên hợp lệ. Lịch mới chưa có cam kết.

**Luồng chính:** Hộ nhập giờ, sức chứa, offer được bán và phân công tài nguyên. Backend kiểm tra khoảng thời gian, giới hạn người, số lượng pool tại từng thời điểm và mọi tài nguyên bắt buộc. Hợp lệ thì mở lịch cùng các assignment trong một transaction.

**Kết quả:** Lịch xuất hiện khi đủ điều kiện công khai, tài nguyên được dành dù chưa có khách. Không phân lại tài nguyên dùng chung cho từng booking.

**Ngoại lệ:** Thiếu một tài nguyên hoặc xung đột khi hai lịch cùng mở thì toàn thao tác thất bại. Khoảng kết thúc/bắt đầu bằng nhau không giao nhau. Lịch đang có cam kết không được sửa giờ/sức chứa/tài nguyên bằng thao tác thông thường; có thể đóng nhận khách.

### UC-11 — Đặt từ lịch mở sẵn

**Tiền điều kiện:** Khách có tài khoản hoạt động; chọn hạng mục của cùng một hộ đang được nhận đặt. Tài khoản chủ hộ thực hiện trong vai khách khi đặt hộ khác.

**Luồng chính:**

1. Khách chọn phòng/kỳ lưu trú và/hoặc slot/offer, số người, số đơn vị được phép, phụ phí, liên hệ.
2. Giao diện hiển thị lịch từng hạng mục, tổng giá dự tính, đơn vị giá và điều kiện. Khách gửi yêu cầu với khóa chống trùng.
3. Backend kiểm tra quyền, hộ, bản bán hiện hành và toàn bộ lựa chọn; tự tính giá, quantity và resourceUsages.
4. Trong transaction, kiểm tra phòng, quota người/tài nguyên, quyền độc quyền và hạn giữ của toàn đơn.
5. Tạo booking PENDING, snapshot, hold và lịch sử/sự kiện, rồi commit.
6. Trả mã đơn, giá đã lưu và expiresAt; hộ nhận yêu cầu để xử lý UC-13.

**Kết quả:** Một đơn đúng một hộ; giữ được toàn bộ hoặc không giữ gì. Chỉ giữ chỗ, chưa xác nhận phục vụ hoặc xác nhận đã thu tiền.

**Ngoại lệ:** Hạng mục khác hộ, đơn rỗng, phòng trùng, ghép/riêng xung đột trong chính đơn, thiếu tài nguyên, hộ mất duyệt hoặc còn dưới 30 phút phản hồi đều bị từ chối. Hết khả dụng do người khác đặt phải trả kết quả rõ để khách chọn lại. Gửi lại cùng thao tác trả cùng đơn, không tạo bản sao.

### UC-13 — Xác nhận hoặc từ chối

**Tiền điều kiện:** Chủ hộ đúng quyền, tài khoản hoạt động, booking PENDING còn hạn. Xác nhận còn yêu cầu hộ được phép nhận cam kết mới.

**Luồng chính:** Hộ xem snapshot và chọn xác nhận hoặc từ chối có lý do. Backend khóa/đọc lại trạng thái, phê duyệt và hiệu lực giữ chỗ. Xác nhận chuyển PENDING thành CONFIRMED mà không giữ thêm lần hai. Từ chối chuyển REJECTED và trả phần giữ của đơn.

**Ngoại lệ:** Hết hạn, đã hủy, đã từ chối hoặc thu hồi duyệt thắng trước thì không xác nhận được. Đóng slot chỉ ngừng nhận đơn mới, không tự vô hiệu hold cũ còn hợp lệ. Không cho Admin hoặc khách thực hiện xác nhận thay hộ.

### UC-14, UC-15, UC-16 — Tổ chức theo lịch riêng

**Tiền điều kiện:** Khách đã đăng nhập, hộ đang được nhận đặt; yêu cầu thuộc đúng khách và hộ.

**Luồng chính:**

1. Khách gửi thời gian mong muốn, số người và nhu cầu. Chỉ tạo CustomScheduleRequest, chưa có booking hoặc hold.
2. Hộ lập phương án cụ thể, gồm lịch, phòng/dịch vụ cùng hộ, tài nguyên được phân, giá và điều kiện.
3. Hộ gửi phương án; backend giữ đầy đủ trong một transaction và công bố version cùng expiresAt.
4. Nếu cần sửa, hộ gửi bản thay thế. Chuyển toàn bộ giữ chỗ sang phiên bản mới nguyên tử và giữ deadline gốc; thất bại giữ nguyên bản cũ.
5. Khách xem đúng phương án và chấp nhận bằng ID/version. Server kiểm tra quyền, hiệu lực, phê duyệt hộ và giữ chỗ sau khi lấy khóa.
6. Chuyển hold thành booking CONFIRMED, lưu liên kết về phương án được chấp nhận. Không cần hộ xác nhận thêm.

**Nhánh khác:** Khách từ chối phương án hoặc rút yêu cầu thì đóng phần chờ tương ứng và trả hold. Yêu cầu ban đầu chưa có phương án không tự giữ tài nguyên. Hết hạn hoặc thu hồi duyệt không sinh booking; muốn bắt đầu vòng mới phải có hành động rõ ràng và kiểm tra lại.

**Ngoại lệ:** Bản cũ sau khi sửa, chấp nhận quá hạn, thiếu giữ chỗ hoặc hộ mất duyệt bị từ chối. Accept, sửa và hết hạn đồng thời phải cho một kết quả hợp lệ duy nhất. Retry lần accept đã thành công trả cùng booking kể cả hiện tại đã qua hạn phương án.

### UC-17 — Booking ngoài ứng dụng

**Tiền điều kiện:** Hộ đúng quyền, được phép nhận đặt; có thông tin khách ngoài hệ thống và lựa chọn hợp lệ.

**Luồng chính:** Hộ nhập liên hệ, chọn phòng/slot hoặc lập lịch nội bộ có tài nguyên; backend dùng cùng kiểm tra khả dụng và transaction như online nhưng tạo trực tiếp CONFIRMED, lưu nguồn ngoài ứng dụng và người nhập.

**Kết quả:** Đơn tham gia cùng phép tính khả dụng, thu chi và kết quả phục vụ. Không tạo user giả, không tự liên kết với tài khoản đăng ký sau và không cấp quyền đánh giá.

**Ngoại lệ:** Không được bỏ qua hold online. Không yêu cầu khoảng chờ tối thiểu 30 phút vì đã xác nhận ngay; mọi điều kiện về thời gian phục vụ và tài nguyên vẫn phải hợp lệ.

### UC-18 — Hủy booking

**Tiền điều kiện:** Khách sở hữu đơn hoặc chủ hộ đúng quyền; chưa đến thời điểm bắt đầu sớm nhất, đơn còn ở trạng thái cho phép hủy.

**Luồng chính:** Khách yêu cầu thì hủy ngay, không chờ hộ duyệt. Hộ hủy phải ghi lý do. Server chuyển CANCELLED, trả phần cam kết của đơn và lưu actor/thời gian/lý do trong transaction.

**Kết quả:** Phần của các booking khác và tài nguyên của slot còn mở bán được bảo toàn. Nghĩa vụ tiền vẫn theo lịch sử thu và thỏa thuận hoàn.

**Ngoại lệ:** Từ khi bắt đầu, không hủy thông thường; dùng UC-19. Hủy đồng thời với xác nhận/accept phải kiểm tra lại trạng thái sau khóa. Không hủy riêng một hạng mục, không tự hoàn tiền và không xóa booking.

### UC-19 — Ghi kết quả phục vụ

**Tiền điều kiện:** Hộ đúng quyền, tài khoản hoạt động, đơn CONFIRMED đã đến giai đoạn phục vụ; vẫn được thực hiện nếu hộ bị thu hồi duyệt.

**Luồng chính:** Hộ ghi kết quả từng phòng/dịch vụ: SERVED, PARTIALLY_SERVED hoặc NOT_SERVED; trường hợp không đầy đủ có lý do, phần đã/chưa phục vụ và thời điểm thực tế khi cần. Backend ghi lịch sử và chỉ tổng hợp khi mọi hạng mục có kết quả cuối.

**Kết quả:** Tất cả phục vụ đủ và đã hết thời gian → COMPLETED. Tất cả không sử dụng vì khách vắng mặt và đã hết thời gian toàn đơn → NO_SHOW. Các trường hợp cuối còn lại → INTERRUPTED. Chỉ giải phóng phần tài nguyên thực sự không còn dùng.

**Ngoại lệ:** Chưa có kết quả một hạng mục thì chưa chốt toàn đơn. Không coi lỗi hộ là khách vắng mặt. Đơn đã CANCELLED không bị đổi thành gián đoạn. Ghi kết quả không tự tính hoặc ghi hoàn tiền.

### UC-20 — Ghi nhận tiền thủ công

**Tiền điều kiện:** Chủ hộ đúng quyền, tài khoản hoạt động; khoản tiền có căn cứ giao dịch thực tế hoặc thỏa thuận hoàn cần lưu. Admin/khách không ghi đã thu thay hộ.

**Luồng chính:** Hộ ghi loại khoản tiền, số tiền, phương thức, thời điểm, ghi chú; khi hoàn, phân biệt khoản đã thống nhất và các lần thực hoàn. Backend chống trùng và lưu bút toán/audit. Nhập sai được điều chỉnh bằng dấu vết liên kết giao dịch gốc.

**Kết quả:** Cọc được tính trong tổng thu một lần; hoàn nhiều lần cộng đúng thực hoàn. Booking hủy/gián đoạn vẫn có thể chờ xử lý tiền; báo cáo không đồng nhất giá trị booking với tiền đã thu.

**Ngoại lệ:** Retry không thêm khoản tiền. Không tự xác nhận booking khi ghi thu, không phục hồi booking hết hạn vì đã nhận tiền, không tự áp phí hủy chưa thống nhất và không xóa lịch sử để sửa số liệu.

### UC-27 — Duyệt và thu hồi phê duyệt hộ

**Tiền điều kiện:** Actor ADMIN; có hồ sơ/đối tượng hợp lệ. Giao diện thể hiện tác động dự kiến trước khi thu hồi.

**Luồng chính:** Admin duyệt, từ chối hoặc thu hồi có lý do. Với thu hồi, application service cập nhật quyền nhận đặt, kết thúc booking PENDING và yêu cầu chưa thành booking, vô hiệu proposal/hold, đóng lịch nhận mới và trả phần tài nguyên không còn nghĩa vụ.

**Kết quả:** Booking đã xác nhận và tài nguyên cần phục vụ được giữ. Chủ hộ còn hoạt động vẫn xử lý đơn cũ, tiền và lịch sử; quyền CUSTOMER không bị mất. Có audit liên kết quyết định quản trị với tác động tự động.

**Ngoại lệ:** Confirm/accept và thu hồi cùng lúc được tuần tự hóa: xác nhận thắng trước thì giữ như đơn cũ; thu hồi thắng trước thì không tạo cam kết mới. Duyệt lại không tự hồi sinh yêu cầu đã kết thúc. Khóa tài khoản là UC-29, không phải cùng hành động.

### UC-28 — Kiểm duyệt bản sửa và ẩn vi phạm

**Tiền điều kiện:** ADMIN có quyền; revision hoặc đối tượng cần xử lý tồn tại.

**Luồng chính:** Admin xem bản đang công khai và bản sửa, duyệt hoặc từ chối có lý do. Duyệt thay con trỏ bản công khai; từ chối giữ bản cũ. Với vi phạm, ẩn đối tượng có lý do và lưu lịch sử.

**Kết quả:** Khách không thấy bản đang chờ duyệt. Booking/proposal cũ giữ snapshot. Hộ không tự mở lại nội dung bị Admin ẩn. Bài chung của nền tảng không cần gán hộ giả.

**Ngoại lệ:** Bản đã bị thay thế/đã xử lý không được duyệt lại như bản đang chờ. Ẩn nội dung không tự sửa giao dịch tiền hoặc xóa lịch sử booking.

### UC-34 — Xử lý hết hạn

**Kích hoạt:** Command đọc/ghi gặp hold đã quá hạn hoặc job định kỳ xử lý phần hết hạn.

**Luồng chính:** Đối chiếu thời gian server, trạng thái và chủ cam kết; kết thúc phần chờ, trả đúng phần giữ và ghi sự kiện thông báo. Thực hiện cùng kỷ luật khóa với confirm/accept/cancel.

**Kết quả:** Phép tính khả dụng loại hold hết hạn ngay cả khi job chưa chạy. Slot công khai đang mở hoặc slot còn đơn xác nhận vẫn giữ tài nguyên của nó.

**Ngoại lệ:** Nếu accept/confirm đã commit trước thì không giải phóng cam kết đã chuyển thành booking. Chạy lại job không trả chỗ hai lần và không phát thông báo trùng.

## 4. Các use case không nằm trong MVP

Không bổ sung use case thanh toán qua cổng, ví nền tảng, tính hoa hồng, mua hàng/giỏ hàng/vận chuyển, booking nhiều hộ, combo có lịch/tồn riêng, hủy riêng hạng mục sau xác nhận, chat realtime, tự xếp lịch hoặc mời nhân viên quản lý hộ.

Liên hệ qua điện thoại/Zalo là hành động mở kênh ngoài, không tích hợp nền tảng chat. Phiếu hỏi sản phẩm không được biến thành Order. Yêu cầu lịch riêng vẫn thuộc MVP, không được thay bằng ghi chú tự do trong Booking PENDING để bỏ qua Proposal/version/hold.

## 5. Điều kiện hoàn tất bộ use case

- Mỗi UC có actor, quyền, kết quả và vị trí module rõ; các UC giao dịch có ngoại lệ và ranh giới transaction.
- API và giao diện phải thể hiện được cả các nhánh từ chối/hết hạn/thu hồi/sự cố, không chỉ luồng thành công.
- Dữ liệu ERD/schema phải đủ cho toàn bộ UC và các ràng buộc của đặc tả; không suy schema chỉ từ màn hình.
- Khi nghiệm thu phần mềm, chạy các AC được liên kết, bổ sung kiểm thử màn hình và quyền theo từng UC. Các AC liên quan không thay cho bằng chứng thử từng chức năng quản trị/catalog.
- Tất cả các UC là phạm vi phải thực hiện trước khi gọi sản phẩm là MVP hoàn chỉnh; thứ tự phát triển không làm đổi phạm vi đã chốt.
