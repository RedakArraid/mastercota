import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/services/api_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';

class AcademyScreen extends StatefulWidget {
  const AcademyScreen({super.key});

  @override
  State<AcademyScreen> createState() => _AcademyScreenState();
}

class _AcademyScreenState extends State<AcademyScreen> {
  bool _loading = true;
  String? _error;
  List<dynamic> _enrollments = [];
  List<dynamic> _courses = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        ApiService.get('/api/academy/me'),
        ApiService.get('/api/academy/courses'),
      ]);
      if (!mounted) return;
      setState(() {
        _enrollments = (results[0]['enrollments'] as List?) ?? [];
        _courses = (results[1]['courses'] as List?) ?? [];
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  double _progress(Map<String, dynamic> item) {
    final total = (item['lessons_count'] as num?)?.toDouble() ?? 0;
    final done = (item['completed_lessons'] as num?)?.toDouble() ?? 0;
    return total <= 0 ? 0 : (done / total).clamp(0, 1);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cream,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          color: AppColors.accentBright,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 110),
            children: [
              Text(
                'MASTERCOTA ACADEMY',
                style: AppTextStyles.caption.copyWith(color: AppColors.accent),
              ),
              const SizedBox(height: 6),
              Text(
                'Apprendre, progresser, certifier.',
                style: AppTextStyles.displayMedium.copyWith(fontSize: 30),
              ),
              const SizedBox(height: 8),
              Text(
                'Retrouvez vos cours et découvrez de nouveaux programmes.',
                style: AppTextStyles.bodyMedium.copyWith(color: AppColors.ink3),
              ),
              const SizedBox(height: 24),
              if (_loading)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(40),
                    child: CircularProgressIndicator(),
                  ),
                )
              else if (_error != null)
                _MessageCard(message: _error!, action: _load)
              else ...[
                if (_enrollments.isNotEmpty) ...[
                  Text(
                    'Mes cours',
                    style: AppTextStyles.headlineLarge.copyWith(fontSize: 22),
                  ),
                  const SizedBox(height: 12),
                  ..._enrollments.map((raw) {
                    final item = Map<String, dynamic>.from(raw as Map);
                    final status = item['status']?.toString() ?? '';
                    return GestureDetector(
                      onTap: status == 'active' || status == 'completed'
                          ? () => context.push('/academy/learn/${item['course_id']}')
                          : null,
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: AppColors.paper,
                          borderRadius: BorderRadius.circular(AppColors.radiusXl),
                          border: Border.all(color: AppColors.line),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.ink.withValues(alpha: 0.05),
                              blurRadius: 24,
                              spreadRadius: -10,
                              offset: const Offset(0, 10),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    item['title']?.toString() ?? 'Cours',
                                    style: AppTextStyles.headlineMedium.copyWith(
                                      fontSize: 18,
                                    ),
                                  ),
                                ),
                                _StatusChip(status: status),
                              ],
                            ),
                            if (item['instructor_name'] != null) ...[
                              const SizedBox(height: 4),
                              Text(
                                item['instructor_name'].toString(),
                                style: AppTextStyles.bodySmall.copyWith(
                                  color: AppColors.ink3,
                                ),
                              ),
                            ],
                            if (status == 'active' || status == 'completed') ...[
                              const SizedBox(height: 14),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(20),
                                child: LinearProgressIndicator(
                                  value: _progress(item),
                                  minHeight: 7,
                                  backgroundColor: AppColors.paper2,
                                  color: status == 'completed'
                                      ? AppColors.success
                                      : AppColors.accentBright,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                '${item['completed_lessons'] ?? 0}/${item['lessons_count'] ?? 0} leçons',
                                style: AppTextStyles.caption.copyWith(
                                  color: AppColors.ink3,
                                ),
                              ),
                            ] else ...[
                              const SizedBox(height: 8),
                              Text(
                                'Accès en attente de confirmation du paiement.',
                                style: AppTextStyles.bodySmall.copyWith(
                                  color: AppColors.warn,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    );
                  }),
                  const SizedBox(height: 20),
                ],
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Découvrir',
                      style: AppTextStyles.headlineLarge.copyWith(fontSize: 22),
                    ),
                    Text(
                      '${_courses.length} cours',
                      style: AppTextStyles.caption.copyWith(color: AppColors.ink3),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (_courses.isEmpty)
                  const _MessageCard(
                    message: 'Aucun cours publié pour le moment.',
                  )
                else
                  ..._courses.map((raw) {
                    final course = Map<String, dynamic>.from(raw as Map);
                    final price =
                        (course['price'] as num?)?.toInt() ??
                        int.tryParse(course['price']?.toString() ?? '') ??
                        0;
                    return GestureDetector(
                      onTap: () =>
                          context.push('/academy/course/${course['slug']}'),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 14),
                        clipBehavior: Clip.antiAlias,
                        decoration: BoxDecoration(
                          color: AppColors.paper,
                          borderRadius: BorderRadius.circular(AppColors.radiusXl),
                          border: Border.all(color: AppColors.line),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              height: 120,
                              width: double.infinity,
                              decoration: const BoxDecoration(
                                gradient: const LinearGradient(colors: [AppColors.ink, AppColors.ink2]),
                              ),
                              child: const Icon(
                                Icons.school_rounded,
                                color: AppColors.accentBright,
                                size: 44,
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.all(18),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    course['category']
                                            ?.toString()
                                            .toUpperCase() ??
                                        'COURS',
                                    style: AppTextStyles.caption.copyWith(
                                      color: AppColors.accent,
                                    ),
                                  ),
                                  const SizedBox(height: 5),
                                  Text(
                                    course['title']?.toString() ?? 'Cours',
                                    style: AppTextStyles.headlineMedium.copyWith(
                                      fontSize: 19,
                                    ),
                                  ),
                                  if (course['subtitle'] != null) ...[
                                    const SizedBox(height: 5),
                                    Text(
                                      course['subtitle'].toString(),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: AppTextStyles.bodySmall.copyWith(
                                        color: AppColors.ink3,
                                      ),
                                    ),
                                  ],
                                  const SizedBox(height: 12),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          course['instructor_name']
                                                  ?.toString() ??
                                              'Instructeur Mastercota',
                                          style: AppTextStyles.bodySmall
                                              .copyWith(
                                                fontWeight: FontWeight.w600,
                                              ),
                                        ),
                                      ),
                                      Text(
                                        course['access_type'] == 'invite'
                                            ? 'Privé'
                                            : price == 0
                                                ? 'Gratuit'
                                                : '${_formatNumber(price)} F',
                                        style: AppTextStyles.bodyMedium.copyWith(
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.ink,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
              ],
            ],
          ),
        ),
      ),
    );
  }

  static String _formatNumber(int value) {
    final s = value.toString();
    return s.replaceAllMapped(
      RegExp(r'\B(?=(\d{3})+(?!\d))'),
      (m) => ' ',
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String status;
  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    final complete = status == 'completed';
    final active = status == 'active';
    final label = complete ? 'Terminé' : active ? 'En cours' : 'En attente';
    final color = complete
        ? AppColors.success
        : active
            ? AppColors.ink
            : AppColors.warn;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.09),
        borderRadius: BorderRadius.circular(100),
      ),
      child: Text(
        label,
        style: AppTextStyles.caption.copyWith(
          color: color,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _MessageCard extends StatelessWidget {
  final String message;
  final Future<void> Function()? action;
  const _MessageCard({required this.message, this.action});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.paper,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        children: [
          Text(
            message,
            textAlign: TextAlign.center,
            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.ink3),
          ),
          if (action != null) ...[
            const SizedBox(height: 12),
            TextButton(onPressed: action, child: const Text('Réessayer')),
          ],
        ],
      ),
    );
  }
}
