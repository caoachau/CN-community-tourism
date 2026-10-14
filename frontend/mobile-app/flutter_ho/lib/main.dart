import 'package:flutter/material.dart';
import 'package:tourism_ui/tourism_ui.dart';

void main() => runApp(const MyApp());

class MyApp extends StatelessWidget {
  const MyApp({super.key});
  @override
  Widget build(BuildContext context) => const TourismApp(initialHost: true);
}
