import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:tourism_ui/src/live/api.dart';
import 'package:tourism_ui/src/live/media.dart';

class Vault implements RefreshVault {
  @override
  Future<String?> read() async => null;
  @override
  Future<void> write(String? value) async {}
}

http.Response ok(Json data) => http.Response(
  jsonEncode({'success': true, 'data': data}),
  200,
  headers: {'content-type': 'application/json; charset=utf-8'},
);
final imageBytes = base64Decode(
  'UklGRjoAAABXRUJQVlA4IC4AAADQAQCdASoEAAQAAUAmJaACdLoB+AADsAD+82mX/mwIGaH0wf+mkeNI8aR8poAA',
);
const profile = {'revisionId': '10', 'version': 2};
Json image(String id, bool cover) => {
  'id': id,
  'url': '/media/00000000-0000-0000-0000-${id.padLeft(12, '0')}.webp',
  'isCover': cover,
};
Future<TourismApi> signedApi(
  Future<http.Response> Function(http.Request) handler,
) async {
  final api = TourismApi(
    baseUrl: 'http://127.0.0.1/api/v1',
    vault: Vault(),
    client: MockClient((request) async {
      if (request.url.path.endsWith('/auth/login')) {
        return ok({
          'accessToken': 'access',
          'refreshToken': 'refresh',
          'user': {'id': '1', 'role': 'HOUSEHOLD', 'status': 'ACTIVE'},
        });
      }
      if (request.url.path.contains('/media/')) {
        return http.Response.bytes(
          imageBytes,
          200,
          headers: {'content-type': 'image/webp'},
        );
      }
      return handler(request);
    }),
  );
  await api.authenticate({
    'email': 'test@example.invalid',
    'password': 'test password',
  });
  return api;
}

void main() {
  testWidgets(
    'gallery reorders images, changes cover and confirms removal with current revision tokens',
    (tester) async {
      var images = [image('1', true), image('2', false)], token = 'first';
      Json? lastOrder;
      Json snapshot() => {
        ...profile,
        'status': 'DRAFT',
        'mediaToken': token,
        'images': images,
      };
      final api = await signedApi((request) async {
        if (request.method == 'PUT') {
          final body = object(jsonDecode(request.body));
          lastOrder = body;
          expect(body['expectedToken'], token);
          expect(body['revisionId'], '10');
          images = [
            for (final id in body['imageIds'] as List)
              image(id as String, id == body['coverImageId']),
          ];
          token = 'changed';
        }
        if (request.method == 'DELETE') {
          expect(object(jsonDecode(request.body))['expectedToken'], token);
          images = [image('1', true)];
          token = 'removed';
        }
        return ok(snapshot());
      });
      addTearDown(api.dispose);
      await tester.pumpWidget(
        MaterialApp(
          home: MediaManager(
            api: api,
            path: '/households/me',
            profile: profile,
            editable: true,
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Đưa ảnh ra sau').first);
      await tester.pumpAndSettle();
      expect(lastOrder!['imageIds'], ['2', '1']);
      expect(lastOrder!['coverImageId'], '1');
      await tester.tap(find.byTooltip('Đặt làm ảnh bìa').first);
      await tester.pumpAndSettle();
      expect(lastOrder!['coverImageId'], '2');
      await tester.tap(find.byTooltip('Gỡ ảnh').first);
      await tester.pumpAndSettle();
      expect(find.text('Gỡ ảnh khỏi bản nháp?'), findsOneWidget);
      await tester.tap(find.widgetWithText(FilledButton, 'Gỡ ảnh'));
      await tester.pumpAndSettle();
      expect(find.textContaining('1/12 ảnh'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('submitted galleries cannot upload, reorder or remove photos', (
    tester,
  ) async {
    final api = await signedApi(
      (_) async => ok({
        ...profile,
        'status': 'PENDING',
        'mediaToken': 'token',
        'images': [image('1', true)],
      }),
    );
    addTearDown(api.dispose);
    await tester.pumpWidget(
      MaterialApp(
        home: MediaManager(
          api: api,
          path: '/households/me',
          profile: profile,
          editable: false,
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(
      tester
          .widget<FilledButton>(
            find.widgetWithText(FilledButton, 'Tải ảnh lên'),
          )
          .onPressed,
      isNull,
    );
    expect(
      tester
          .widget<IconButton>(
            find.byWidgetPredicate(
              (widget) => widget is IconButton && widget.tooltip == 'Gỡ ảnh',
            ),
          )
          .onPressed,
      isNull,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'archival requires a reason and keeps the latest revision reference',
    (tester) async {
      Json? command;
      var changed = false;
      final api = await signedApi((request) async {
        expect(request.method, 'DELETE');
        command = object(jsonDecode(request.body));
        return ok({'changed': true});
      });
      addTearDown(api.dispose);
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ArchiveAction(
              api: api,
              path: '/households/me',
              profile: profile,
              archived: false,
              onChanged: () => changed = true,
            ),
          ),
        ),
      );
      await tester.tap(find.text('Xóa / lưu trữ'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Xác nhận'));
      await tester.pumpAndSettle();
      expect(command, isNull);
      expect(find.text('Vui lòng nhập lý do'), findsOneWidget);
      await tester.enterText(
        find.byType(TextFormField),
        'Tạm ngừng kinh doanh',
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Xác nhận'));
      await tester.pumpAndSettle();
      expect(command, {...profile, 'reason': 'Tạm ngừng kinh doanh'});
      expect(changed, true);
      expect(tester.takeException(), isNull);
    },
  );
}
