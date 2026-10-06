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
      shareMessage: clearShareMessage
          ? null
          : (shareMessage ?? this.shareMessage),
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
  final String? wavePhone;
  final String? wavePayLink;
  final String? wavePayoutMode;
  final String? feeReference;
  final int extensionCount;
  final int durationDays;
  final double platformFee;
  final double? publicProgress;
  final DateTime? startsAt;
  final String? closeReason;
  final Map<String, dynamic>? lifecycle;
  final Map<String, dynamic>? platformPayment;
  final int editVersion;
  bool get isPendingFee => status == 'pending_fee';
  bool get hasWave => wavePayoutMode == 'phone'
      ? wavePhone != null
      : wavePayoutMode == 'business'
      ? wavePayLink != null
      : (wavePhone != null || wavePayLink != null);
  bool get canExtend =>
      lifecycle?['can_extend'] as bool? ??
      ((status == 'active' || status == 'closed') &&
          !paymentNeedsReview &&
          currentAmount < targetAmount &&
          extensionCount == 0 &&
          startsAt != null &&
          DateTime.utc(deadline.year, deadline.month, deadline.day + 10)
                  .difference(
                    DateTime.utc(
                      startsAt!.year,
                      startsAt!.month,
                      startsAt!.day,
                    ),
                  )
                  .inDays <=
              60 &&
          daysRemaining >= -10);
  bool get canReopen =>
      lifecycle?['can_reopen'] as bool? ??
      (status == 'closed' &&
          daysRemaining >= 0 &&
          currentAmount < targetAmount);
  bool get canRecordContribution =>
      lifecycle?['can_record_contribution'] as bool? ?? !isPendingFee;
  bool get paymentNeedsReview =>
      platformPayment?['application_status'] == 'review_required' &&
      !paymentReviewResolved;
  bool get paymentReviewResolved =>
      platformPayment?['application_status'] == 'review_required' &&
      platformPayment?['review_resolved_at'] != null;

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
    this.wavePhone,
    this.wavePayLink,
    this.wavePayoutMode,
    this.feeReference,
    this.extensionCount = 0,
    this.durationDays = 35,
    this.platformFee = 0,
    this.publicProgress,
    this.startsAt,
    this.closeReason,
    this.lifecycle,
    this.platformPayment,
    this.editVersion = 0,
  });

  // ── Computed ────────────────────────────────────────────
  double get progressPercent => publicProgress != null
      ? (publicProgress! / 100).clamp(0.0, 1.0)
      : targetAmount > 0
      ? (currentAmount / targetAmount).clamp(0.0, 1.0)
      : 0.0;

  int get daysRemaining {
    final now = DateTime.now().toUtc();
    return DateTime.utc(
      deadline.year,
      deadline.month,
      deadline.day,
    ).difference(DateTime.utc(now.year, now.month, now.day)).inDays;
  }

  bool get isActive => status == 'active' && daysRemaining >= 0;
  bool get isCompleted => status == 'completed';
  bool get isExpired =>
      !isPendingFee &&
      !isCompleted &&
      (closeReason == 'expired' ||
          (closeReason != 'manual' && daysRemaining < 0));
  bool get isClosed => status == 'closed' && !isExpired;
  String get statusLabel {
    if (isPendingFee) {
      if (paymentReviewResolved) return 'Paiement examiné';
      return paymentNeedsReview ? 'Paiement à examiner' : 'Frais en attente';
    }
    if (isCompleted) return 'Objectif atteint';
    if (isExpired) return 'Expirée';
    if (isClosed) return 'Clôturée';
    if (isActive) return daysRemaining == 0 ? 'Dernier jour' : 'En cours';
    return 'Indisponible';
  }

  // ── Serialization ───────────────────────────────────────
  factory CotisationModel.fromJson(Map<String, dynamic> json) {
    num parseNum(dynamic v) {
      if (v is num) return v;
      return num.tryParse(v?.toString() ?? '') ?? 0;
    }

    return CotisationModel(
      id: json['id'] as String,
      slug: json['slug'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      coverUrl: json['cover_url'] as String?,
      targetAmount: parseNum(json['target_amount']).toDouble(),
      currentAmount: parseNum(json['current_amount']).toDouble(),
      deadline: DateTime.parse(json['deadline'] as String),
      ownerId: json['owner_id'] as String? ?? '',
      wavePhone: json['owner_wave_phone'] as String?,
      wavePayLink: json['owner_wave_pay_link'] as String?,
      wavePayoutMode: json['owner_wave_payout_mode'] as String?,
      feeReference: json['platform_fee_reference'] as String?,
      extensionCount: (json['extension_count'] as num?)?.toInt() ?? 0,
      durationDays: (json['duration_days'] as num?)?.toInt() ?? 35,
      platformFee: parseNum(json['platform_fee_amount']).toDouble(),
      publicProgress: (json['progress_percent'] as num?)?.toDouble(),
      startsAt: DateTime.tryParse(json['starts_at']?.toString() ?? ''),
      closeReason: json['close_reason'] as String?,
      lifecycle: json['lifecycle'] as Map<String, dynamic>?,
      platformPayment: json['platform_payment'] as Map<String, dynamic>?,
      editVersion: (json['edit_version'] as num?)?.toInt() ?? 0,
      status: json['status'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      settings: CotisationSettings.fromJson(
        json['settings'] as Map<String, dynamic>?,
      ),
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
      wavePhone: wavePhone,
      wavePayLink: wavePayLink,
      wavePayoutMode: wavePayoutMode,
      feeReference: feeReference,
      extensionCount: extensionCount,
      durationDays: durationDays,
      platformFee: platformFee,
      publicProgress: publicProgress,
      startsAt: startsAt,
      closeReason: closeReason,
      lifecycle: lifecycle,
      platformPayment: platformPayment,
      editVersion: editVersion,
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
  final String? note;
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
    this.note,
    required this.createdAt,
  });

  bool get isPaid => status == 'paid';
  String get statusLabel => switch (status) {
    'paid' => 'Reçu',
    'awaiting_confirmation' => 'À confirmer',
    'rejected' => 'Refusé',
    'failed' => 'Échoué',
    _ => 'En attente',
  };

  factory ContributionModel.fromJson(Map<String, dynamic> json) {
    num parseNum(dynamic v) {
      if (v is num) return v;
      return num.tryParse(v?.toString() ?? '') ?? 0;
    }

    return ContributionModel(
      id: json['id'] as String,
      cotisationId: json['cotisation_id'] as String,
      contributorName: json['contributor_name'] as String,
      contributorPhone: (json['contributor_phone'] as String?) ?? '',
      amount: parseNum(json['amount']).toDouble(),
      status: json['status'] as String,
      paystackReference: json['paystack_reference'] as String?,
      paymentMethod: json['payment_method'] as String?,
      note: json['note'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}
