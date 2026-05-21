// ─────────────────────────────────────────────────────────
// CotisationSettings — paramètres d'affichage public
// ─────────────────────────────────────────────────────────

class CotisationSettings {
  /// Afficher le meilleur contributeur (top montant)
  final bool showBestContributor;

  /// Afficher la liste des contributeurs
  final bool showContributors;

  /// Afficher la barre de progression + montant collecté
  final bool showProgress;

  /// Afficher le montant cible
  final bool showTargetAmount;

  /// Permettre les contributions sans nom (anonyme)
  final bool anonymousAllowed;

  /// Montant minimum de contribution (0 = pas de minimum)
  final double minAmount;

  /// Message personnalisé accompagnant le lien de partage
  final String? shareMessage;

  const CotisationSettings({
    this.showBestContributor = true,
    this.showContributors = true,
    this.showProgress = true,
    this.showTargetAmount = true,
    this.anonymousAllowed = false,
    this.minAmount = 0,
    this.shareMessage,
  });

  static const CotisationSettings defaults = CotisationSettings();

  factory CotisationSettings.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const CotisationSettings();
    return CotisationSettings(
      showBestContributor: json['show_best_contributor'] as bool? ?? true,
      showContributors: json['show_contributors'] as bool? ?? true,
      showProgress: json['show_progress'] as bool? ?? true,
      showTargetAmount: json['show_target_amount'] as bool? ?? true,
      anonymousAllowed: json['anonymous_allowed'] as bool? ?? false,
      minAmount: (json['min_amount'] as num?)?.toDouble() ?? 0,
      shareMessage: json['share_message'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'show_best_contributor': showBestContributor,
        'show_contributors': showContributors,
        'show_progress': showProgress,
        'show_target_amount': showTargetAmount,
        'anonymous_allowed': anonymousAllowed,
        'min_amount': minAmount,
        'share_message': shareMessage,
      };

  CotisationSettings copyWith({
    bool? showBestContributor,
    bool? showContributors,
    bool? showProgress,
    bool? showTargetAmount,
    bool? anonymousAllowed,
    double? minAmount,
    String? shareMessage,
    bool clearShareMessage = false,
  }) {
    return CotisationSettings(
      showBestContributor: showBestContributor ?? this.showBestContributor,
      showContributors: showContributors ?? this.showContributors,
      showProgress: showProgress ?? this.showProgress,
      showTargetAmount: showTargetAmount ?? this.showTargetAmount,
      anonymousAllowed: anonymousAllowed ?? this.anonymousAllowed,
      minAmount: minAmount ?? this.minAmount,
      shareMessage:
          clearShareMessage ? null : (shareMessage ?? this.shareMessage),
    );
  }
}

// ─────────────────────────────────────────────────────────
// CotisationModel
// ─────────────────────────────────────────────────────────

class CotisationModel {
  final String id;
  final String slug;
  final String title;
  final String? description;
  final String? coverUrl;
  final double targetAmount;
  final double currentAmount;
  final DateTime deadline;
  final String ownerId;
  final String status;
  final DateTime createdAt;
  final CotisationSettings settings;

  const CotisationModel({
    required this.id,
    required this.slug,
    required this.title,
    this.description,
    this.coverUrl,
    required this.targetAmount,
    required this.currentAmount,
    required this.deadline,
    required this.ownerId,
    required this.status,
    required this.createdAt,
    this.settings = const CotisationSettings(),
  });

  // ── Computed ────────────────────────────────────────────
  double get progressPercent =>
      targetAmount > 0 ? (currentAmount / targetAmount).clamp(0.0, 1.0) : 0.0;

  int get daysRemaining => deadline.difference(DateTime.now()).inDays;

  bool get isActive => status == 'active' && daysRemaining >= 0;
  bool get isCompleted =>
      status == 'completed' || (progressPercent >= 1 && status == 'active');
  bool get isClosed => status == 'closed' || (daysRemaining < 0 && !isCompleted);

  // ── Serialization ───────────────────────────────────────
  factory CotisationModel.fromJson(Map<String, dynamic> json) {
    return CotisationModel(
      id: json['id'] as String,
      slug: json['slug'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      coverUrl: json['cover_url'] as String?,
      targetAmount: (json['target_amount'] as num).toDouble(),
      currentAmount: (json['current_amount'] as num?)?.toDouble() ?? 0.0,
      deadline: DateTime.parse(json['deadline'] as String),
      ownerId: json['owner_id'] as String,
      status: json['status'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      settings: CotisationSettings.fromJson(
          json['settings'] as Map<String, dynamic>?),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'slug': slug,
        'title': title,
        'description': description,
        'cover_url': coverUrl,
        'target_amount': targetAmount,
        'current_amount': currentAmount,
        'deadline': deadline.toIso8601String().split('T').first,
        'owner_id': ownerId,
        'status': status,
        'created_at': createdAt.toIso8601String(),
        'settings': settings.toJson(),
      };

  CotisationModel copyWith({
    String? id,
    String? slug,
    String? title,
    String? description,
    String? coverUrl,
    double? targetAmount,
    double? currentAmount,
    DateTime? deadline,
    String? ownerId,
    String? status,
    DateTime? createdAt,
    CotisationSettings? settings,
  }) {
    return CotisationModel(
      id: id ?? this.id,
      slug: slug ?? this.slug,
      title: title ?? this.title,
      description: description ?? this.description,
      coverUrl: coverUrl ?? this.coverUrl,
      targetAmount: targetAmount ?? this.targetAmount,
      currentAmount: currentAmount ?? this.currentAmount,
      deadline: deadline ?? this.deadline,
      ownerId: ownerId ?? this.ownerId,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      settings: settings ?? this.settings,
    );
  }
}


// ─────────────────────────────────────────────────────────

class ContributionModel {
  final String id;
  final String cotisationId;
  final String contributorName;
  final String contributorPhone;
  final double amount;
  final String status;
  final String? paystackReference;
  final String? paymentMethod;
  final DateTime createdAt;

  const ContributionModel({
    required this.id,
    required this.cotisationId,
    required this.contributorName,
    required this.contributorPhone,
    required this.amount,
    required this.status,
    this.paystackReference,
    this.paymentMethod,
    required this.createdAt,
  });

  bool get isPaid => status == 'paid';

  factory ContributionModel.fromJson(Map<String, dynamic> json) {
    return ContributionModel(
      id: json['id'] as String,
      cotisationId: json['cotisation_id'] as String,
      contributorName: json['contributor_name'] as String,
      contributorPhone: json['contributor_phone'] as String,
      amount: (json['amount'] as num).toDouble(),
      status: json['status'] as String,
      paystackReference: json['paystack_reference'] as String?,
      paymentMethod: json['payment_method'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}
