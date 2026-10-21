import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:tourism_ui/src/live/api.dart';
import 'package:tourism_ui/src/live/app.dart';
import 'package:tourism_ui/src/live/common.dart';
import 'package:tourism_ui/src/live/definitions.dart';
import 'package:tourism_ui/src/live/management.dart';
import 'package:tourism_ui/src/theme.dart';

class Vault implements RefreshVault {
  String? value;
  @override
  Future<String?> read() async => value;
  @override
  Future<void> write(String? token) async {
    value = token;
  }
}

http.Response ok(Json data) => http.Response(
  jsonEncode({
    'success': true,
    'data': data,
    'meta': {'requestId': 'test-reference'},
  }),
  200,
  headers: {'content-type': 'application/json; charset=utf-8'},
);
http.Response missing() => http.Response(
  jsonEncode({
    'success': false,
    'error': {'code': 'NOT_FOUND'},
    'meta': {'requestId': 'test-reference'},
  }),
  404,
);
const user = {
  'id': '9007199254740993',
  'displayName': 'Người dùng thật từ API',
  'email': 'person@example.invalid',
  'role': 'CUSTOMER',
  'status': 'ACTIVE',
};
Json credentials(String role) => {
  'accessToken': 'test-access',
  'refreshToken': 'test-refresh',
  'user': {...user, 'role': role},
};
Json empty() => {'items': [], 'total': 0, 'page': 1, 'pageSize': 20};
Future<void> phone(WidgetTester tester) async {
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

void main() {
  testWidgets(
    'blank optional paragraphs are omitted and validation errors preserve each field',
    (tester) async {
      final api = TourismApi(
        vault: Vault(),
        client: MockClient((_) async => ok(credentials('HOUSEHOLD'))),
      );
      addTearDown(api.dispose);
      await api.authenticate({
        'email': 'person@example.invalid',
        'password': 'test-only-password',
      });
      Json? sent;
      await tester.pumpWidget(
        MaterialApp(
          home: DataForm(
            api: api,
            title: 'Tạo điểm',
            initial: {
              'title': 'Điểm A',
              'body': 'Mô tả điểm A',
              'details': {'address': 'Địa chỉ A'},
            },
            fields: const [
              FieldSpec('title', 'Tên'),
              FieldSpec('body', 'Mô tả', kind: InputKind.paragraph),
              FieldSpec('details.address', 'Địa chỉ'),
              FieldSpec(
                'details.directions',
                'Chỉ dẫn',
                kind: InputKind.paragraph,
              ),
            ],
            save: (data) async {
              sent = data;
              throw const ApiFailure(
                'VALIDATION_ERROR',
                issues: [
                  {
                    'path': ['title'],
                  },
                ],
              );
            },
          ),
        ),
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Lưu nháp'));
      await tester.pumpAndSettle();
      expect(object(sent!['details']).containsKey('directions'), false);
      for (final entry in {
        'title': 'Điểm A',
        'body': 'Mô tả điểm A',
        'details.address': 'Địa chỉ A',
      }.entries) {
        expect(
          tester
              .widget<TextFormField>(find.byKey(ValueKey('field-${entry.key}')))
              .controller!
              .text,
          entry.value,
        );
      }
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'private history hides the previous account data after a new login',
    (tester) async {
      final api = TourismApi(
        vault: Vault(),
        client: MockClient((request) async {
          if (request.url.path.endsWith('/auth/login')) {
            return ok(credentials('HOUSEHOLD'));
          }
          return ok({
            ...empty(),
            'total': 1,
            'items': [
              {
                'version': 1,
                'status': 'DRAFT',
                'title': 'Nội dung riêng của hộ trước',
                'body': 'Nội dung riêng',
              },
            ],
          });
        }),
      );
      addTearDown(api.dispose);
      await api.authenticate({
        'email': 'first@example.invalid',
        'password': 'test-only-password',
      });
      await tester.pumpWidget(
        MaterialApp(
          home: RevisionHistory(
            api: api,
            path: '/households/me/revisions',
            kind: 'HOUSEHOLD',
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Phiên bản 1 · Bản nháp'), findsOneWidget);
      await api.authenticate({
        'email': 'second@example.invalid',
        'password': 'test-only-password',
      });
      await tester.pumpAndSettle();
      expect(find.text('Phiên bản 1 · Bản nháp'), findsNothing);
      expect(
        find.textContaining('Phiên đăng nhập đã thay đổi'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'public catalog renders API records and room filters rather than demo offers',
    (tester) async {
      await phone(tester);
      final queries = <Uri>[];
      final api = TourismApi(
        baseUrl: 'http://127.0.0.1/api/v1',
        vault: Vault(),
        client: MockClient((request) async {
          queries.add(request.url);
          if (request.url.path.endsWith('/public/services')) {
            return ok({
              ...empty(),
              'total': 1,
              'items': [
                {
                  'id': '9007199254740999',
                  'title': 'Dịch vụ được công khai từ API',
                  'householdName': 'Hộ từ API',
                  'category': {'name': 'Nông nghiệp'},
                  'defaultDurationMinutes': 120,
                  'offers': [],
                },
              ],
            });
          }
          return ok(empty());
        }),
      );
      addTearDown(api.dispose);
      await api.restore();
      await tester.pumpWidget(
        ConnectedTourismApp(api: api, showWelcome: false),
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Dịch vụ được công khai từ API'));
      expect(find.text('Homestay Nhà của Pao'), findsNothing);
      await tester.tap(find.text('Lưu trú'));
      await tester.pumpAndSettle();
      expect(queries.any((uri) => uri.path.endsWith('/public/rooms')), true);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'member login calls the backend and shows its current user without elevating roles',
    (tester) async {
      await phone(tester);
      Json? login;
      final api = TourismApi(
        baseUrl: 'http://127.0.0.1/api/v1',
        vault: Vault(),
        client: MockClient((request) async {
          if (request.url.path.endsWith('/auth/login')) {
            login = object(jsonDecode(request.body));
            return ok(credentials('CUSTOMER'));
          }
          if (request.url.path.endsWith('/auth/me')) return ok({'user': user});
          if (request.url.path.endsWith('/households/me')) return missing();
          return ok(empty());
        }),
      );
      addTearDown(api.dispose);
      await api.restore();
      await tester.pumpWidget(
        ConnectedTourismApp(api: api, showWelcome: false),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Cá nhân').last);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Đăng nhập tài khoản'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('field-email')),
        'person@example.invalid',
      );
      await tester.enterText(
        find.byKey(const ValueKey('field-password')),
        'test-only-password',
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Đăng nhập'));
      await tester.pumpAndSettle();
      expect(login, {
        'email': 'person@example.invalid',
        'password': 'test-only-password',
      });
      expect(api.isHousehold, false);
      expect(find.text('Người dùng thật từ API'), findsOneWidget);
      expect(find.text('Khách thành viên'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'room submission sends the exact revision and price token; pending content becomes read-only',
    (tester) async {
      await phone(tester);
      Json? submitted;
      var pending = false;
      Json view() => {
        'room': {
          'id': '9007199254740994',
          'householdId': '1',
          'code': 'RM-TEST',
          'nightlyPriceVnd': 0,
          'pricingToken': 'a' * 64,
          'supplyStatus': 'AVAILABLE',
          'visibility': 'VISIBLE',
          'archivedAt': null,
        },
        'profile': {
          'revisionId': '9007199254740995',
          'version': 3,
          'title': 'Phòng từ API',
          'body': 'Phòng lưu trú có cấu hình theo phiên bản đầy đủ.',
          'placeId': '1',
          'maxGuests': 4,
          'checkInTime': '14:00',
          'checkOutTime': '12:00',
          'details': {
            'amenities': ['Wi-Fi'],
            'houseRules': [],
          },
          'terms': {'includedItems': [], 'excludedItems': []},
          'status': pending ? 'PENDING' : 'DRAFT',
        },
        'publishedProfile': null,
      };
      final api = TourismApi(
        baseUrl: 'http://127.0.0.1/api/v1',
        vault: Vault(),
        client: MockClient((request) async {
          if (request.url.path.endsWith('/auth/login')) {
            return ok(credentials('HOUSEHOLD'));
          }
          if (request.url.path.endsWith('/auth/me')) {
            return ok({
              'user': {...user, 'role': 'HOUSEHOLD'},
            });
          }
          if (request.url.path.endsWith('/households/me')) {
            return ok({
              'household': {'approvalStatus': 'APPROVED', 'archivedAt': null},
            });
          }
          if (request.url.path.endsWith('/submissions')) {
            submitted = object(jsonDecode(request.body));
            pending = true;
            return ok({...view(), 'changed': true});
          }
          return ok(view());
        }),
      );
      addTearDown(api.dispose);
      await api.authenticate({
        'email': 'person@example.invalid',
        'password': 'test-only-password',
      });
      await tester.pumpWidget(
        MaterialApp(
          theme: tourismTheme(),
          home: ResourceDetail(
            api: api,
            kind: ResourceKind.room,
            id: '9007199254740994',
          ),
        ),
      );
      await tester.pumpAndSettle();
      final submit = find.widgetWithText(OutlinedButton, 'Gửi xét duyệt');
      await tester.ensureVisible(submit);
      await tester.tap(submit);
      await tester.pumpAndSettle();
      expect(submitted, {
        'revisionId': '9007199254740995',
        'version': 3,
        'pricingToken': 'a' * 64,
      });
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Sửa nội dung'),
            )
            .onPressed,
        isNull,
      );
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'room form preserves exact zero VND and validates maximum money and local times',
    (tester) async {
      await phone(tester);
      Json? saved;
      final api = TourismApi(
        vault: Vault(),
        client: MockClient((request) async => ok(credentials('HOUSEHOLD'))),
      );
      addTearDown(api.dispose);
      await api.authenticate({
        'email': 'person@example.invalid',
        'password': 'test-only-password',
      });
      await tester.pumpWidget(
        MaterialApp(
          theme: tourismTheme(),
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => DataForm(
                      api: api,
                      title: 'Thêm phòng',
                      fields: resourceFields(ResourceKind.room, create: true),
                      initial: {
                        ...profileDefaults(ResourceKind.room),
                        'title': 'Phòng thử nghiệm',
                      },
                      save: (data) async {
                        saved = data;
                        return data;
                      },
                    ),
                  ),
                ),
                child: const Text('Mở form'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Mở form'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Lưu nháp'));
      await tester.pumpAndSettle();
      expect(saved!['nightlyPriceVnd'], 0);
      expect(saved!['checkInTime'], '14:00');
      expect(saved!['maxGuests'], 2);
      expect(saved!.containsKey('householdId'), false);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'per-group offer form excludes per-unit limits and keeps billing separate from participant bounds',
    (tester) async {
      await phone(tester);
      Json? saved;
      final api = TourismApi(
        vault: Vault(),
        client: MockClient((request) async => ok(credentials('HOUSEHOLD'))),
      );
      addTearDown(api.dispose);
      await api.authenticate({
        'email': 'person@example.invalid',
        'password': 'test-only-password',
      });
      await tester.pumpWidget(
        MaterialApp(
          theme: tourismTheme(),
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => DataForm(
                      api: api,
                      title: 'Phương thức bán',
                      fields: offerFields,
                      initial: {
                        'name': 'Một nhóm hướng dẫn',
                        'participationMode': 'EXCLUSIVE',
                        'pricingType': 'PER_GROUP',
                        'minParticipants': 1,
                        'maxParticipants': 5,
                        'unitPriceVnd': 500000,
                        'isActive': true,
                      },
                      validatePayload: validateOffer,
                      save: (data) async {
                        saved = data;
                        return data;
                      },
                    ),
                  ),
                ),
                child: const Text('Mở form'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Mở form'));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('field-maxUnits')), findsNothing);
      await tester.tap(find.widgetWithText(FilledButton, 'Lưu nháp'));
      await tester.pumpAndSettle();
      expect(saved!['maxParticipants'], 5);
      expect(saved!['pricingType'], 'PER_GROUP');
      expect(saved!.containsKey('maxUnits'), false);
      expect(saved!.containsKey('quantity'), false);
      expect(saved!['addons'], []);
      expect(tester.takeException(), isNull);
    },
  );
}
