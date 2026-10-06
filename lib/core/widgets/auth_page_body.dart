import 'package:flutter/material.dart';

/// Keeps authentication forms reachable on short screens and with the keyboard open.
class AuthPageBody extends StatelessWidget {
  final Widget child;
  const AuthPageBody({super.key, required this.child});

  @override
  Widget build(BuildContext context) => SafeArea(
    child: LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        padding: const EdgeInsets.symmetric(horizontal: 28),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
          child: child,
        ),
      ),
    ),
  );
}
