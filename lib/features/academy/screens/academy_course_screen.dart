import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/services/api_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';

class AcademyCourseScreen extends StatefulWidget {
  final String slug;
  const AcademyCourseScreen({super.key, required this.slug});

  @override
  State<AcademyCourseScreen> createState() => _AcademyCourseScreenState();
}

class _AcademyCourseScreenState extends State<AcademyCourseScreen> {
  bool _loading = true;
  bool _busy = false;
  String? _error;
  Map<String, dynamic>? _course;
  List<dynamic> _outline = [];
  final _coupon = TextEditingController();
  final _invite = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _coupon.dispose();
    _invite.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final data = await ApiService.get('/api/academy/courses/${widget.slug}');
      if (!mounted) return;
      setState(() {
        _course = Map<String, dynamic>.from(data['course'] as Map);
        _outline = (data['outline'] as List?) ?? [];
      });
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _enroll() async {
    final course = _course;
    if (course == null) return;
    setState(() => _busy = true);
    try {
      final result = await ApiService.post(
        '/api/academy/courses/${course['id']}/enroll',
        body: {
          if (_coupon.text.trim().isNotEmpty)
            'coupon_code': _coupon.text.trim(),
          if (_invite.text.trim().isNotEmpty)
            'invite_code': _invite.text.trim(),
        },
      );
      if (!mounted) return;

      if (result['owner'] == true) {
        _snack('Vous êtes l’instructeur de ce cours.');
        return;
      }

      if (result['payment_required'] != true) {
        context.push('/academy/learn/${course['id']}');
        return;
      }

      await _showPaymentDialog(result);
    } on ApiException catch (e) {
      _snack(e.message);
    } catch (e) {
      _snack('Inscription impossible : $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _showPaymentDialog(Map<String, dynamic> result) async {
    final enrollment = Map<String, dynamic>.from(result['enrollment'] as Map);
    final payout = Map<String, dynamic>.from((result['payout'] as Map?) ?? {});
    final amount = (result['amount_due'] as num?)?.toInt() ??
        int.tryParse(result['amount_due']?.toString() ?? '') ??
        0;
    final reference = TextEditingController();
    final note = TextEditingController();

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.paper,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(
          20,
          22,
          20,
          24 + MediaQuery.of(ctx).viewInsets.bottom,
        ),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Paiement du cours',
                style: AppTextStyles.headlineLarge.copyWith(fontSize: 24),
              ),
              const SizedBox(height: 8),
              Text(
                '${_formatNumber(amount)} F à envoyer directement à l’instructeur.',
                style: AppTextStyles.bodyMedium.copyWith(color: AppColors.ink3),
              ),
              const SizedBox(height: 18),
              if (payout['wave_pay_link'] is String &&
                  (payout['wave_pay_link'] as String).isNotEmpty)
                FilledButton.icon(
                  onPressed: () async {
                    final uri = Uri.parse(payout['wave_pay_link'].toString());
                    if (await canLaunchUrl(uri)) {
                      await launchUrl(uri, mode: LaunchMode.externalApplication);
                    }
                  },
                  icon: const Icon(Icons.open_in_new_rounded),
                  label: const Text('Ouvrir le paiement'),
                )
              else if (payout['wave_phone'] != null)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.paper2,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(
                    'Numéro de réception : ${payout['wave_phone']}',
                    style: AppTextStyles.bodyMedium.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              const SizedBox(height: 18),
              TextField(
                controller: reference,
                decoration: const InputDecoration(
                  labelText: 'Référence du transfert (facultatif)',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: note,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Note (facultatif)',
                ),
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () async {
                    try {
                      await ApiService.post(
                        '/api/academy/enrollments/${enrollment['id']}/payment-report',
                        body: {
                          if (reference.text.trim().isNotEmpty)
                            'reference': reference.text.trim(),
                          if (note.text.trim().isNotEmpty)
                            'note': note.text.trim(),
                        },
                      );
                      if (!ctx.mounted) return;
                      Navigator.pop(ctx);
                      _snack(
                        'Paiement signalé. L’instructeur doit confirmer la réception.',
                      );
                    } on ApiException catch (e) {
                      _snack(e.message);
                    }
                  },
                  icon: const Icon(Icons.check_circle_outline_rounded),
                  label: const Text('J’ai effectué le paiement'),
                ),
              ),
            ],
          ),
        ),
      ),
    );

    reference.dispose();
    note.dispose();
  }

  void _snack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    if (_error != null || _course == null) {
      return Scaffold(
        appBar: AppBar(),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(_error ?? 'Cours introuvable'),
          ),
        ),
      );
    }

    final course = _course!;
    final accessType = course['access_type']?.toString() ?? 'free';
    final price = (course['price'] as num?)?.toInt() ??
        int.tryParse(course['price']?.toString() ?? '') ??
        0;

    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        title: const Text('Academy'),
        backgroundColor: AppColors.cream,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
        children: [
          Container(
            height: 180,
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [AppColors.ink, AppColors.ink2]),
              borderRadius: BorderRadius.circular(AppColors.radiusXl),
            ),
            child: const Icon(
              Icons.school_rounded,
              size: 58,
              color: AppColors.accentBright,
            ),
          ),
          const SizedBox(height: 22),
          Text(
            course['category']?.toString().toUpperCase() ?? 'COURS',
            style: AppTextStyles.caption.copyWith(color: AppColors.accent),
          ),
          const SizedBox(height: 5),
          Text(
            course['title']?.toString() ?? 'Cours',
            style: AppTextStyles.displayMedium.copyWith(fontSize: 30),
          ),
          if (course['subtitle'] != null) ...[
            const SizedBox(height: 8),
            Text(
              course['subtitle'].toString(),
              style: AppTextStyles.bodyLarge.copyWith(color: AppColors.ink3),
            ),
          ],
          const SizedBox(height: 12),
          Text(
            'Par ${course['instructor_name'] ?? 'Instructeur Mastercota'}',
            style: AppTextStyles.bodySmall.copyWith(
              color: AppColors.ink3,
              fontWeight: FontWeight.w600,
            ),
          ),
          if (course['description'] != null) ...[
            const SizedBox(height: 18),
            Text(
              course['description'].toString(),
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.ink2,
                height: 1.55,
              ),
            ),
          ],
          const SizedBox(height: 24),
          Text(
            accessType == 'invite'
                ? 'Accès sur invitation'
                : price == 0
                    ? 'Gratuit'
                    : '${_formatNumber(price)} F',
            style: AppTextStyles.headlineLarge.copyWith(fontSize: 24),
          ),
          const SizedBox(height: 12),
          if (accessType == 'paid')
            TextField(
              controller: _coupon,
              decoration: const InputDecoration(
                labelText: 'Coupon (facultatif)',
              ),
            ),
          if (accessType == 'invite')
            TextField(
              controller: _invite,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                labelText: 'Code d’invitation',
              ),
            ),
          if (accessType != 'free') const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _busy ||
                      (accessType == 'invite' && _invite.text.trim().isEmpty)
                  ? null
                  : _enroll,
              icon: Icon(
                accessType == 'invite'
                    ? Icons.lock_open_rounded
                    : Icons.play_circle_fill_rounded,
              ),
              label: Text(
                _busy
                    ? 'Vérification…'
                    : accessType == 'free'
                        ? 'S’inscrire gratuitement'
                        : accessType == 'invite'
                            ? 'Utiliser mon invitation'
                            : 'Accéder au cours',
              ),
            ),
          ),
          const SizedBox(height: 30),
          Text(
            'Programme',
            style: AppTextStyles.headlineLarge.copyWith(fontSize: 22),
          ),
          const SizedBox(height: 12),
          ..._outline.asMap().entries.map((entry) {
            final section = Map<String, dynamic>.from(entry.value as Map);
            final lessons = (section['lessons'] as List?) ?? [];
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.paper,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.line),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'SECTION ${entry.key + 1}',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.accent,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    section['title']?.toString() ?? 'Section',
                    style: AppTextStyles.headlineMedium.copyWith(fontSize: 17),
                  ),
                  const SizedBox(height: 10),
                  ...lessons.map((raw) {
                    final lesson = Map<String, dynamic>.from(raw as Map);
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(
                        children: [
                          Icon(
                            lesson['preview'] == true
                                ? Icons.visibility_rounded
                                : Icons.lock_outline_rounded,
                            size: 17,
                            color: AppColors.ink3,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              lesson['title']?.toString() ?? 'Leçon',
                              style: AppTextStyles.bodyMedium,
                            ),
                          ),
                          Text(
                            '${lesson['duration_minutes'] ?? 0} min',
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.ink3,
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  static String _formatNumber(int value) {
    return value.toString().replaceAllMapped(
      RegExp(r'\B(?=(\d{3})+(?!\d))'),
      (m) => ' ',
    );
  }
}
