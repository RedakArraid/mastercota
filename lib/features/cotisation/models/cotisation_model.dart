// ─────────────────────────────────────────────────────────
// CotisationModel & ContributionModel
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
