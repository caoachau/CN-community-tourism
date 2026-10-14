import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Short, finite transitions. OS accessibility settings always take precedence.
Duration motionTime(BuildContext context, [int milliseconds = 280]) =>
    MediaQuery.disableAnimationsOf(context)
    ? Duration.zero
    : Duration(milliseconds: milliseconds);

class SoftPageTransition extends PageTransitionsBuilder {
  const SoftPageTransition();
  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    if (MediaQuery.disableAnimationsOf(context)) return child;
    final curve = animation.drive(CurveTween(curve: Curves.easeOutCubic));
    return FadeTransition(
      opacity: curve,
      child: SlideTransition(
        position: Tween(
          begin: const Offset(.045, 0),
          end: Offset.zero,
        ).animate(curve),
        child: child,
      ),
    );
  }
}

class Reveal extends StatelessWidget {
  const Reveal({super.key, required this.child, this.order = 0});
  final Widget child;
  final int order;
  @override
  Widget build(BuildContext context) {
    if (MediaQuery.disableAnimationsOf(context)) return child;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: 380 + order.clamp(0, 4) * 65),
      curve: Curves.easeOutCubic,
      child: child,
      builder: (_, value, child) => Opacity(
        opacity: value,
        child: Transform.translate(
          offset: Offset(0, 16 * (1 - value)),
          child: child,
        ),
      ),
    );
  }
}

/// Adds tactile feedback while the enclosed Material control keeps keyboard,
/// focus, semantics and activation behavior.
class TouchFeedback extends StatefulWidget {
  const TouchFeedback({super.key, required this.child});
  final Widget child;
  @override
  State<TouchFeedback> createState() => _TouchFeedbackState();
}

class _TouchFeedbackState extends State<TouchFeedback> {
  bool pressed = false, hovered = false;
  @override
  Widget build(BuildContext context) => MouseRegion(
    onEnter: (_) => setState(() => hovered = true),
    onExit: (_) => setState(() {
      hovered = false;
      pressed = false;
    }),
    child: Listener(
      onPointerDown: (_) => setState(() => pressed = true),
      onPointerUp: (_) => setState(() => pressed = false),
      onPointerCancel: (_) => setState(() => pressed = false),
      child: AnimatedScale(
        scale: pressed
            ? .978
            : hovered
            ? 1.008
            : 1,
        duration: motionTime(context, 160),
        curve: Curves.easeOutCubic,
        child: widget.child,
      ),
    ),
  );
}

class PrimaryAction extends StatelessWidget {
  const PrimaryAction({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon = Icons.arrow_forward_rounded,
    this.busy = false,
    this.light = false,
  });
  final String label;
  final VoidCallback? onPressed;
  final IconData icon;
  final bool busy, light;
  @override
  Widget build(BuildContext context) => TouchFeedback(
    child: SizedBox(
      width: double.infinity,
      child: FilledButton(
        style: light
            ? FilledButton.styleFrom(
                backgroundColor: const Color(0xFFDAE9B8),
                foregroundColor: const Color(0xFF193D32),
              )
            : null,
        onPressed: busy || onPressed == null
            ? null
            : () {
                HapticFeedback.selectionClick();
                onPressed!();
              },
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 5),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Flexible(child: Text(label, textAlign: TextAlign.center)),
              const SizedBox(width: 12),
              if (busy)
                const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              else
                Icon(icon, size: 20),
            ],
          ),
        ),
      ),
    ),
  );
}
