import 'package:flutter/material.dart';

import '../core/network.dart';
import '../core/theme.dart';

class NAvatar extends StatelessWidget {
  const NAvatar({super.key, required this.name, this.url, this.size = 44});
  final String name;
  final String? url; // server path like /api/files/<id> or absolute URL
  final double size;

  @override
  Widget build(BuildContext context) {
    final initials = name.trim().isNotEmpty
        ? name.trim().split(RegExp(r'\s+')).take(2).map((w) => w[0].toUpperCase()).join()
        : '?';
    final hasImage = url != null && url!.isNotEmpty;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: NTColors.accentGradient,
        borderRadius: BorderRadius.circular(size * .32),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(.25), blurRadius: 8)],
      ),
      child: hasImage
          ? ClipRRect(
              borderRadius: BorderRadius.circular(size * .32),
              child: Image.network(
                url!.startsWith('http') ? url! : serverAssetUrl(url!),
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => _initialsWidget(initials, size),
              ),
            )
          : _initialsWidget(initials, size),
    );
  }

  Widget _initialsWidget(String initials, double size) {
    return Center(
      child: Text(initials, style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: size * .34)),
    );
  }
}
