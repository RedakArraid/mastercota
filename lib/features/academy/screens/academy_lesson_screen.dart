import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/services/api_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';

class AcademyLessonScreen extends StatefulWidget {
  final String courseId;
  final String lessonId;
  const AcademyLessonScreen({
    super.key,
    required this.courseId,
    required this.lessonId,
  });

  @override
  State<AcademyLessonScreen> createState() => _AcademyLessonScreenState();
}

class _AcademyLessonScreenState extends State<AcademyLessonScreen> {
  bool _loading = true;
  bool _busy = false;
  String? _error;
  Map<String, dynamic>? _lesson;
  Map<String, dynamic>? _quiz;
  Map<String, dynamic>? _progress;
  Map<String, dynamic>? _quizResult;
  Map<String, dynamic>? _assignment;
  Map<String, dynamic>? _submission;
  Map<String, dynamic>? _note;
  final _noteController = TextEditingController();
  final _assignmentController = TextEditingController();
  final _assignmentUrlController = TextEditingController();
  bool _bookmarked = false;
  final Map<String, dynamic> _answers = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        ApiService.get('/api/academy/lessons/${widget.lessonId}'),
        ApiService.get('/api/academy/lessons/${widget.lessonId}/premium')
            .catchError((_) => <String, dynamic>{}),
      ]);
      final data = results[0];
      final premium = results[1];
      if (!mounted) return;
      setState(() {
        _lesson = Map<String, dynamic>.from(data['lesson'] as Map);
        _quiz = data['quiz'] is Map
            ? Map<String, dynamic>.from(data['quiz'] as Map)
            : null;
        _progress = data['progress'] is Map
            ? Map<String, dynamic>.from(data['progress'] as Map)
            : null;
        _assignment = premium['assignment'] is Map
            ? Map<String, dynamic>.from(premium['assignment'] as Map)
            : null;
        _submission = premium['submission'] is Map
            ? Map<String, dynamic>.from(premium['submission'] as Map)
            : null;
        _note = premium['note'] is Map
            ? Map<String, dynamic>.from(premium['note'] as Map)
            : null;
        _noteController.text = _note?['body']?.toString() ?? '';
        _assignmentController.text =
            _submission?['text_content']?.toString() ?? '';
        _assignmentUrlController.text =
            _submission?['submission_url']?.toString() ?? '';
        _bookmarked = _note?['bookmarked'] == true;
      });
      if (_progress == null) {
        await ApiService.post(
          '/api/academy/lessons/${widget.lessonId}/progress',
          body: {'status': 'started', 'progress_seconds': 0},
        );
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openUrl(String? value) async {
    if (value == null || value.isEmpty) return;
    final uri = Uri.tryParse(value);
    if (uri != null && await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _complete() async {
    setState(() => _busy = true);
    try {
      final data = await ApiService.post(
        '/api/academy/lessons/${widget.lessonId}/progress',
        body: {'status': 'completed', 'progress_seconds': 0},
      );
      if (!mounted) return;
      setState(() {
        _progress = Map<String, dynamic>.from(data['progress'] as Map);
      });
      final completion = data['completion'];
      _snack(
        completion is Map && completion['completed'] == true
            ? 'Cours terminé. Bravo !'
            : 'Leçon terminée',
      );
    } on ApiException catch (e) {
      _snack(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _setAnswer(
    String questionId,
    String value,
    bool multiple,
  ) {
    setState(() {
      if (!multiple) {
        _answers[questionId] = value;
        return;
      }
      final selected = (_answers[questionId] as List?)
              ?.map((e) => e.toString())
              .toList() ??
          <String>[];
      if (selected.contains(value)) {
        selected.remove(value);
      } else {
        selected.add(value);
      }
      _answers[questionId] = selected;
    });
  }

  Future<void> _submitQuiz() async {
    final quiz = _quiz;
    if (quiz == null) return;
    setState(() => _busy = true);
    try {
      final data = await ApiService.post(
        '/api/academy/quizzes/${quiz['id']}/attempt',
        body: {'answers': _answers},
      );
      if (!mounted) return;
      setState(() {
        _quizResult = Map<String, dynamic>.from(data);
      });
      final attempt = Map<String, dynamic>.from(data['attempt'] as Map);
      _snack(
        attempt['passed'] == true
            ? 'Quiz réussi : ${attempt['score']}%'
            : 'Score : ${attempt['score']}%',
      );
      await _load();
    } on ApiException catch (e) {
      _snack(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _saveNote() async {
    setState(() => _busy = true);
    try {
      final data = await ApiService.put(
        '/api/academy/lessons/${widget.lessonId}/note',
        body: {
          'body': _noteController.text,
          'bookmarked': _bookmarked,
        },
      );
      if (!mounted) return;
      setState(() {
        _note = data['note'] is Map
            ? Map<String, dynamic>.from(data['note'] as Map)
            : _note;
      });
      _snack('Note privée enregistrée');
    } on ApiException catch (e) {
      _snack(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _submitAssignment() async {
    final assignment = _assignment;
    if (assignment == null) return;
    setState(() => _busy = true);
    try {
      final data = await ApiService.post(
        '/api/academy/assignments/${assignment['id']}/submit',
        body: {
          'text_content': _assignmentController.text.trim().isEmpty
              ? null
              : _assignmentController.text.trim(),
          'submission_url': _assignmentUrlController.text.trim().isEmpty
              ? null
              : _assignmentUrlController.text.trim(),
        },
      );
      if (!mounted) return;
      setState(() {
        _submission = data['submission'] is Map
            ? Map<String, dynamic>.from(data['submission'] as Map)
            : _submission;
      });
      _snack('Devoir remis');
    } on ApiException catch (e) {
      _snack(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _noteController.dispose();
    _assignmentController.dispose();
    _assignmentUrlController.dispose();
    super.dispose();
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
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_error != null || _lesson == null) {
      return Scaffold(
        appBar: AppBar(),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(_error ?? 'Leçon indisponible'),
          ),
        ),
      );
    }

    final lesson = _lesson!;
    final completed = _progress?['status'] == 'completed';
    final resources = (lesson['resources'] as List?) ?? [];

    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        backgroundColor: AppColors.cream,
        title: const Text('Leçon'),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
        children: [
          if (lesson['lesson_type'] == 'video' &&
              lesson['video_url'] != null)
            _MediaCard(
              icon: Icons.play_circle_fill_rounded,
              title: 'Vidéo de la leçon',
              subtitle:
                  'Ouvrez la vidéo dans votre lecteur ou navigateur sécurisé.',
              action: 'Lire la vidéo',
              onTap: () => _openUrl(lesson['video_url']?.toString()),
            ),
          if (lesson['lesson_type'] == 'live' && lesson['live_url'] != null)
            _MediaCard(
              icon: Icons.videocam_rounded,
              title: 'Session en direct',
              subtitle: 'Rejoignez la session avec le lien de l’instructeur.',
              action: 'Rejoindre le live',
              onTap: () => _openUrl(lesson['live_url']?.toString()),
            ),
          Text(
            lesson['title']?.toString() ?? 'Leçon',
            style: AppTextStyles.displayMedium.copyWith(fontSize: 29),
          ),
          if (lesson['content'] != null) ...[
            const SizedBox(height: 16),
            Text(
              lesson['content'].toString(),
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.ink2,
                height: 1.6,
              ),
            ),
          ],
          if (lesson['resource_url'] != null) ...[
            const SizedBox(height: 18),
            OutlinedButton.icon(
              onPressed: () =>
                  _openUrl(lesson['resource_url']?.toString()),
              icon: const Icon(Icons.download_rounded),
              label: const Text('Ouvrir la ressource'),
            ),
          ],
          if (resources.isNotEmpty) ...[
            const SizedBox(height: 18),
            Text(
              'Ressources',
              style: AppTextStyles.headlineMedium.copyWith(fontSize: 18),
            ),
            const SizedBox(height: 8),
            ...resources.map((raw) {
              if (raw is! Map) return const SizedBox.shrink();
              final resource = Map<String, dynamic>.from(raw);
              final url = resource['url']?.toString();
              if (url == null || url.isEmpty) return const SizedBox.shrink();
              return ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.link_rounded),
                title: Text(
                  resource['title']?.toString() ?? 'Ressource',
                ),
                trailing: const Icon(Icons.open_in_new_rounded),
                onTap: () => _openUrl(url),
              );
            }),
          ],
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _busy || completed ? null : _complete,
              icon: const Icon(Icons.check_circle_outline_rounded),
              label: Text(
                completed
                    ? 'Leçon terminée'
                    : 'Marquer comme terminée',
              ),
            ),
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.paper,
              borderRadius: BorderRadius.circular(AppColors.radiusXl),
              border: Border.all(color: AppColors.line),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('NOTES PRIVÉES', style: AppTextStyles.caption.copyWith(color: AppColors.accent)),
                const SizedBox(height: 8),
                TextField(
                  controller: _noteController,
                  minLines: 3,
                  maxLines: 7,
                  decoration: const InputDecoration(
                    hintText: 'Résumé, idées clés, questions à revoir…',
                  ),
                ),
                CheckboxListTile(
                  value: _bookmarked,
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Ajouter aux favoris'),
                  onChanged: _busy
                      ? null
                      : (value) => setState(() => _bookmarked = value == true),
                ),
                Align(
                  alignment: Alignment.centerRight,
                  child: OutlinedButton.icon(
                    onPressed: _busy ? null : _saveNote,
                    icon: const Icon(Icons.save_outlined),
                    label: const Text('Enregistrer'),
                  ),
                ),
              ],
            ),
          ),
          if (_assignment != null) ...[
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppColors.paper,
                borderRadius: BorderRadius.circular(AppColors.radiusXl),
                border: Border.all(color: AppColors.line),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('DEVOIR', style: AppTextStyles.caption.copyWith(color: AppColors.accent)),
                  const SizedBox(height: 6),
                  Text(
                    _assignment!['title']?.toString() ?? 'Travail pratique',
                    style: AppTextStyles.headlineLarge.copyWith(fontSize: 20),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _assignment!['instructions']?.toString() ?? '',
                    style: AppTextStyles.bodySmall.copyWith(color: AppColors.ink3),
                  ),
                  const SizedBox(height: 12),
                  if (_assignment!['submission_type'] != 'url')
                    TextField(
                      controller: _assignmentController,
                      minLines: 4,
                      maxLines: 10,
                      decoration: const InputDecoration(hintText: 'Votre réponse'),
                    ),
                  if (_assignment!['submission_type'] != 'text') ...[
                    const SizedBox(height: 10),
                    TextField(
                      controller: _assignmentUrlController,
                      keyboardType: TextInputType.url,
                      decoration: const InputDecoration(hintText: 'https://…'),
                    ),
                  ],
                  if (_submission != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      _submission!['status'] == 'graded'
                          ? _submission!['passed'] == true
                              ? 'Devoir validé'
                              : 'Devoir corrigé'
                          : _submission!['status'] == 'revision_requested'
                              ? 'Nouvelle version demandée'
                              : 'En attente de correction',
                      style: AppTextStyles.bodySmall.copyWith(
                        fontWeight: FontWeight.w700,
                        color: _submission!['passed'] == true
                            ? AppColors.success
                            : AppColors.ink3,
                      ),
                    ),
                    if (_submission!['feedback'] != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(
                          _submission!['feedback'].toString(),
                          style: AppTextStyles.bodySmall,
                        ),
                      ),
                  ],
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: _busy ? null : _submitAssignment,
                      icon: const Icon(Icons.send_rounded),
                      label: Text(
                        _submission == null
                            ? 'Remettre le devoir'
                            : 'Remettre une nouvelle version',
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (_quiz != null) ...[
            const SizedBox(height: 30),
            _buildQuiz(),
          ],
        ],
      ),
    );
  }

  Widget _buildQuiz() {
    final quiz = _quiz!;
    final questions = (quiz['questions'] as List?) ?? [];
    final feedback = _quizResult?['feedback'] is Map
        ? Map<String, dynamic>.from(
            _quizResult!['feedback'] as Map,
          )
        : <String, dynamic>{};
    final passed = quiz['passed'] == true;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.paper,
        borderRadius: BorderRadius.circular(AppColors.radiusXl),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'QUIZ',
            style: AppTextStyles.caption.copyWith(
              color: AppColors.accent,
            ),
          ),
          const SizedBox(height: 5),
          Text(
            quiz['title']?.toString() ?? 'Quiz',
            style: AppTextStyles.headlineLarge.copyWith(fontSize: 22),
          ),
          const SizedBox(height: 4),
          Text(
            'Score minimum : ${quiz['passing_score']}% · ${quiz['attempts_used']}/${quiz['max_attempts']} tentatives',
            style: AppTextStyles.bodySmall.copyWith(
              color: AppColors.ink3,
            ),
          ),
          const SizedBox(height: 18),
          ...questions.asMap().entries.map((entry) {
            final q = Map<String, dynamic>.from(entry.value as Map);
            final id = q['id'].toString();
            final type = q['question_type']?.toString() ?? 'single';
            final multiple = type == 'multiple';
            final options = type == 'true_false'
                ? <dynamic>['true', 'false']
                : ((q['options'] as List?) ?? []);
            final selected = _answers[id];
            final result = feedback[id] is Map
                ? Map<String, dynamic>.from(feedback[id] as Map)
                : null;

            return Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.paper2,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${entry.key + 1}. ${q['prompt'] ?? ''}',
                    style: AppTextStyles.bodyMedium.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 10),
                  ...options.map((rawOption) {
                    final option = rawOption.toString();
                    final checked = multiple
                        ? selected is List &&
                            selected.map((e) => e.toString()).contains(option)
                        : selected?.toString() == option;
                    return InkWell(
                      onTap: passed
                          ? null
                          : () => _setAnswer(id, option, multiple),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 5),
                        child: Row(
                          children: [
                            Icon(
                              checked
                                  ? multiple
                                      ? Icons.check_box_rounded
                                      : Icons.radio_button_checked_rounded
                                  : multiple
                                      ? Icons.check_box_outline_blank_rounded
                                      : Icons.radio_button_off_rounded,
                              size: 20,
                              color: checked
                                  ? AppColors.accent
                                  : AppColors.ink3,
                            ),
                            const SizedBox(width: 9),
                            Expanded(
                              child: Text(
                                option == 'true'
                                    ? 'Vrai'
                                    : option == 'false'
                                        ? 'Faux'
                                        : option,
                                style: AppTextStyles.bodySmall,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                  if (result != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      result['correct'] == true
                          ? 'Bonne réponse. ${result['explanation'] ?? ''}'
                          : 'Réponse incorrecte. ${result['explanation'] ?? ''}',
                      style: AppTextStyles.bodySmall.copyWith(
                        color: result['correct'] == true
                            ? AppColors.success
                            : AppColors.error,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ],
              ),
            );
          }),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _busy ||
                      passed ||
                      (quiz['attempts_used'] as num? ?? 0) >=
                          (quiz['max_attempts'] as num? ?? 0)
                  ? null
                  : _submitQuiz,
              child: Text(passed ? 'Quiz réussi' : 'Soumettre mes réponses'),
            ),
          ),
        ],
      ),
    );
  }
}

class _MediaCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String action;
  final VoidCallback onTap;

  const _MediaCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.action,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 22),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [AppColors.ink, AppColors.ink2]),
        borderRadius: BorderRadius.circular(AppColors.radiusXl),
      ),
      child: Column(
        children: [
          Icon(icon, size: 46, color: AppColors.accentBright),
          const SizedBox(height: 10),
          Text(
            title,
            style: AppTextStyles.headlineMedium.copyWith(
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 5),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: AppTextStyles.bodySmall.copyWith(
              color: Colors.white.withValues(alpha: 0.62),
            ),
          ),
          const SizedBox(height: 14),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.accentBright,
              foregroundColor: AppColors.ink,
            ),
            onPressed: onTap,
            child: Text(action),
          ),
        ],
      ),
    );
  }
}
