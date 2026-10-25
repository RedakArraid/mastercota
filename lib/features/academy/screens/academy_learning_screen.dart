import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/services/api_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';

class AcademyLearningScreen extends StatefulWidget {
  final String courseId;
  const AcademyLearningScreen({super.key, required this.courseId});

  @override
  State<AcademyLearningScreen> createState() => _AcademyLearningScreenState();
}

class _AcademyLearningScreenState extends State<AcademyLearningScreen> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _course;
  Map<String, dynamic>? _enrollment;
  List<dynamic> _outline = [];
  List<dynamic> _progress = [];
  List<dynamic> _announcements = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await ApiService.get(
        '/api/academy/learning/${widget.courseId}',
      );
      if (!mounted) return;
      setState(() {
        _course = Map<String, dynamic>.from(data['course'] as Map);
        _enrollment = data['enrollment'] is Map
            ? Map<String, dynamic>.from(data['enrollment'] as Map)
            : null;
        _outline = (data['outline'] as List?) ?? [];
        _progress = (data['progress'] as List?) ?? [];
        _announcements = (data['announcements'] as List?) ?? [];
      });
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  bool _done(String lessonId) {
    return _progress.any((raw) {
      final p = Map<String, dynamic>.from(raw as Map);
      return p['lesson_id'] == lessonId && p['status'] == 'completed';
    });
  }

  int get _totalLessons => _outline.fold<int>(0, (sum, raw) {
    final section = Map<String, dynamic>.from(raw as Map);
    return sum + ((section['lessons'] as List?)?.length ?? 0);
  });

  int get _completedLessons => _progress.where((raw) {
    final p = Map<String, dynamic>.from(raw as Map);
    return p['status'] == 'completed';
  }).length;

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_error != null || _course == null) {
      return Scaffold(
        appBar: AppBar(),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(_error ?? 'Cours inaccessible'),
          ),
        ),
      );
    }

    final course = _course!;
    final total = _totalLessons;
    final completed = _completedLessons;
    final ratio = total == 0 ? 0.0 : (completed / total).clamp(0.0, 1.0);
    Map<String, dynamic>? firstIncomplete;
    for (final sectionRaw in _outline) {
      final section = Map<String, dynamic>.from(sectionRaw as Map);
      for (final lessonRaw in (section['lessons'] as List?) ?? []) {
        final lesson = Map<String, dynamic>.from(lessonRaw as Map);
        if (!_done(lesson['id'].toString())) {
          firstIncomplete = lesson;
          break;
        }
      }
      if (firstIncomplete != null) break;
    }

    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        backgroundColor: AppColors.cream,
        title: const Text('Mon cours'),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppColors.accentBright,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
          children: [
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [AppColors.ink, AppColors.ink2]),
                borderRadius: BorderRadius.circular(AppColors.radiusXl),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    course['category']?.toString().toUpperCase() ?? 'ACADEMY',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.accentBright,
                    ),
                  ),
                  const SizedBox(height: 7),
                  Text(
                    course['title']?.toString() ?? 'Cours',
                    style: AppTextStyles.headlineLarge.copyWith(
                      color: Colors.white,
                      fontSize: 24,
                    ),
                  ),
                  if (course['subtitle'] != null) ...[
                    const SizedBox(height: 7),
                    Text(
                      course['subtitle'].toString(),
                      style: AppTextStyles.bodySmall.copyWith(
                        color: Colors.white.withValues(alpha: 0.65),
                      ),
                    ),
                  ],
                  const SizedBox(height: 18),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: LinearProgressIndicator(
                      value: ratio,
                      minHeight: 8,
                      color: AppColors.accentBright,
                      backgroundColor: Colors.white.withValues(alpha: 0.12),
                    ),
                  ),
                  const SizedBox(height: 7),
                  Text(
                    '$completed/$total leçons terminées',
                    style: AppTextStyles.caption.copyWith(
                      color: Colors.white.withValues(alpha: 0.65),
                    ),
                  ),
                  if (firstIncomplete != null) ...[
                    const SizedBox(height: 18),
                    FilledButton.icon(
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.accentBright,
                        foregroundColor: AppColors.ink,
                      ),
                      onPressed: () => context.push(
                        '/academy/learn/${widget.courseId}/lesson/${firstIncomplete!['id']}',
                      ),
                      icon: const Icon(Icons.play_circle_fill_rounded),
                      label: const Text('Continuer'),
                    ),
                  ],
                ],
              ),
            ),
            if (_announcements.isNotEmpty) ...[
              const SizedBox(height: 18),
              Builder(
                builder: (context) {
                  final a = Map<String, dynamic>.from(_announcements.first as Map);
                  return Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.accent.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: AppColors.accent.withValues(alpha: 0.18),
                      ),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(
                          Icons.campaign_rounded,
                          color: AppColors.accent,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                a['title']?.toString() ?? 'Annonce',
                                style: AppTextStyles.bodyMedium.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                a['body']?.toString() ?? '',
                                style: AppTextStyles.bodySmall.copyWith(
                                  color: AppColors.ink3,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ],
            const SizedBox(height: 26),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Programme',
                  style: AppTextStyles.headlineLarge.copyWith(fontSize: 22),
                ),
                if (_enrollment?['status'] == 'completed')
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.success.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(100),
                    ),
                    child: Text(
                      'Terminé',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.success,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            ..._outline.asMap().entries.map((entry) {
              final section = Map<String, dynamic>.from(entry.value as Map);
              final lessons = (section['lessons'] as List?) ?? [];
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                clipBehavior: Clip.antiAlias,
                decoration: BoxDecoration(
                  color: AppColors.paper,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.line),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: double.infinity,
                      color: AppColors.paper2,
                      padding: const EdgeInsets.all(15),
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
                            style: AppTextStyles.bodyMedium.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                    ...lessons.asMap().entries.map((lessonEntry) {
                      final lesson = Map<String, dynamic>.from(
                        lessonEntry.value as Map,
                      );
                      final done = _done(lesson['id'].toString());
                      return InkWell(
                        onTap: () => context.push(
                          '/academy/learn/${widget.courseId}/lesson/${lesson['id']}',
                        ),
                        child: Container(
                          padding: const EdgeInsets.all(15),
                          decoration: BoxDecoration(
                            border: lessonEntry.key == lessons.length - 1
                                ? null
                                : const Border(
                                    bottom: BorderSide(
                                      color: AppColors.line,
                                    ),
                                  ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                done
                                    ? Icons.check_circle_rounded
                                    : Icons.play_circle_outline_rounded,
                                color: done
                                    ? AppColors.success
                                    : AppColors.ink3,
                                size: 20,
                              ),
                              const SizedBox(width: 11),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '${lessonEntry.key + 1}. ${lesson['title'] ?? 'Leçon'}',
                                      style: AppTextStyles.bodyMedium.copyWith(
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    const SizedBox(height: 3),
                                    Text(
                                      '${lesson['lesson_type'] ?? 'text'} · ${lesson['duration_minutes'] ?? 0} min',
                                      style: AppTextStyles.caption.copyWith(
                                        color: AppColors.ink3,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const Icon(
                                Icons.chevron_right_rounded,
                                color: AppColors.ink3,
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}
