import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:tourism_ui/src/live/api.dart';

class MemoryVault implements RefreshVault {
  String? token;
  @override
  Future<String?> read() async => token;
  @override
  Future<void> write(String? value) async {
    token = value;
  }
}

Json session([String name = 'first', String role = 'CUSTOMER']) => {
  'accessToken': 'access-$name',
  'refreshToken': 'refresh-$name',
  'user': {
    'id': '9007199254740993',
    'displayName': 'Khách thử nghiệm',
    'email': 'test@example.invalid',
    'status': 'ACTIVE',
    'role': role,
  },
};
http.Response ok(Json data) => http.Response(
  jsonEncode({
    'success': true,
    'data': data,
    'meta': {'requestId': 'support-id'},
  }),
  200,
  headers: {'content-type': 'application/json; charset=utf-8'},
);
http.Response failure(String code, [int status = 401]) => http.Response(
  jsonEncode({
    'success': false,
    'error': {'code': code, 'message': 'PRIVATE_SQL_CREDENTIALS'},
    'meta': {'requestId': 'support-id'},
  }),
  status,
);
TourismApi apiWith(
  FutureOr<http.Response> Function(http.Request) handler,
  MemoryVault vault,
) => TourismApi(
  baseUrl: 'http://127.0.0.1/api/v1',
  vault: vault,
  client: MockClient((request) async => handler(request)),
);

void main() {
  test('login uses the API, preserves string IDs, stores only refresh and sends Bearer', () async {
    final vault = MemoryVault();
    late TourismApi api;
    api = apiWith((request) {
      if (request.url.path.endsWith('/auth/login')) return ok(session());
      expect(request.headers['Authorization'], 'Bearer access-first');
      expect(jsonDecode(request.body)['householdId'], '9007199254740993');
      return ok({'done': true});
    }, vault);
    addTearDown(api.dispose);
    await api.authenticate({
      'email': 'test@example.invalid',
      'password': 'test-only-password',
    });
    expect(api.user!['id'], '9007199254740993');
    expect(vault.token, 'refresh-first');
    await api.request(
      'POST',
      '/private',
      body: {'householdId': '9007199254740993'},
    );
  });
  test('expired parallel requests rotate a refresh token once', () async {
    var rotations = 0;
    final vault = MemoryVault();
    final api = apiWith((request) async {
      if (request.url.path.endsWith('/auth/login')) return ok(session());
      if (request.url.path.endsWith('/auth/refresh')) {
        rotations++;
        await Future<void>.delayed(const Duration(milliseconds: 10));
        return ok(session('next'));
      }
      if (request.headers['Authorization'] == 'Bearer access-first') {
        return failure('UNAUTHENTICATED');
      }
      return ok({'items': []});
    }, vault);
    addTearDown(api.dispose);
    await api.authenticate({
      'email': 'test@example.invalid',
      'password': 'test-only-password',
    });
    await Future.wait([api.request('GET', '/one'), api.request('GET', '/two')]);
    expect(rotations, 1);
    expect(vault.token, 'refresh-next');
  });
  test(
    'current user reflects promotion to HOUSEHOLD using the same account',
    () async {
      final api = apiWith(
        (request) => request.url.path.endsWith('/auth/login')
            ? ok(session())
            : ok({'user': session('next', 'HOUSEHOLD')['user']}),
        MemoryVault(),
      );
      addTearDown(api.dispose);
      await api.authenticate({
        'email': 'test@example.invalid',
        'password': 'test-only-password',
      });
      expect(api.isHousehold, false);
      await api.currentUser();
      expect(api.isHousehold, true);
      expect(api.user!['id'], '9007199254740993');
    },
  );
  test('blocked account clears mobile credentials; network failures keep the live session', () async {
    var blocked = false;
    final vault = MemoryVault();
    final api = apiWith((request) {
      if (request.url.path.endsWith('/auth/login')) return ok(session());
      if (!blocked) throw Exception('PRIVATE_SQL_CREDENTIALS');
      return failure('ACCOUNT_BLOCKED', 403);
    }, vault);
    addTearDown(api.dispose);
    await api.authenticate({
      'email': 'test@example.invalid',
      'password': 'test-only-password',
    });
    await expectLater(
      api.request('GET', '/private'),
      throwsA(isA<ApiFailure>().having((e) => e.code, 'code', 'NETWORK_ERROR')),
    );
    expect(api.signedIn, true);
    blocked = true;
    await expectLater(
      api.request('GET', '/private'),
      throwsA(
        isA<ApiFailure>().having((e) => e.code, 'code', 'ACCOUNT_BLOCKED'),
      ),
    );
    expect(api.signedIn, false);
    expect(vault.token, null);
  });
  test('a late refresh cannot restore a logged-out session or overwrite a new login', () async {
    final started = Completer<void>(),
        release = Completer<void>(),
        vault = MemoryVault();
    final api = apiWith((request) async {
      if (request.url.path.endsWith('/auth/login')) {
        return ok(session(jsonDecode(request.body)['email'] as String));
      }
      if (request.url.path.endsWith('/auth/refresh')) {
        started.complete();
        await release.future;
        return ok(session('old-rotated'));
      }
      return failure('UNAUTHENTICATED');
    }, vault);
    addTearDown(api.dispose);
    await api.authenticate({'email': 'old', 'password': 'test-only-password'});
    final old = api
        .request('GET', '/old')
        .then<Object?>((value) => value, onError: (Object e) => e);
    await started.future;
    await api.authenticate({'email': 'new', 'password': 'test-only-password'});
    release.complete();
    expect(
      await old,
      isA<ApiFailure>().having((e) => e.code, 'code', 'SESSION_CHANGED'),
    );
    expect(api.signedIn, true);
    expect(vault.token, 'refresh-new');
  });
  test('restore uses refresh without persisting access tokens and removes rejected credentials', () async {
    final vault = MemoryVault()..token = 'refresh-expired';
    final api = apiWith((request) => failure('UNAUTHENTICATED'), vault);
    addTearDown(api.dispose);
    await api.restore();
    expect(api.restoring, false);
    expect(api.signedIn, false);
    expect(vault.token, null);
  });
  test('server details never become a visible error message', () async {
    final api = apiWith(
      (request) => failure('INTERNAL_ERROR', 500),
      MemoryVault(),
    );
    addTearDown(api.dispose);
    await expectLater(
      api.request('GET', '/public/rooms', authenticated: false),
      throwsA(
        isA<ApiFailure>()
            .having(
              (e) => e.display,
              'message',
              isNot(contains('PRIVATE_SQL_CREDENTIALS')),
            )
            .having((e) => e.requestId, 'support', 'support-id'),
      ),
    );
  });
}
