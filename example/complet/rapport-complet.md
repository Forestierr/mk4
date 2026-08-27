:title Spécification du Système Autonome MK4
:subtitle Architecture logicielle embarquée et pipeline de traitement temps réel
:author Robin Forestier
:date Août 2026
:lang fr
:numbering 1.1
:toc true

# Introduction et Objectifs
:short Introduction
:id sec_intro

Le projet **MK4** a pour mission de fournir une plateforme haute performance pour l'acquisition et le traitement temps réel de données télémétriques. Ce document détaille les spécifications d'ingénierie logicielle, les contraintes de latence et les algorithmes de filtrage embarqués.

> Ce document est une spécification technique de référence soumise à révision périodique.
:type note

## Exigences fonctionnelles

Les exigences principales sont synthétisées ci-dessous :
- Traitement déterministe avec une gigue (*jitter*) inférieure à $50\ \mu "s"$.
- Prise en charge des protocoles industriels standard[^1].
- Taux de disponibilité nominal garanti : **99.99%**.

- [x] Initialisation du bus CAN-FD
- [x] Étalonnage des capteurs inertiels (IMU)
- [ ] Déploiement du module de communication satellite

[^1]: Protocoles supportés : CAN-FD, SPI haut débit, UART asynchrone et Ethernet TSN.

:layout pagebreak

# Modèle Mathématique et Filtrage
:short Modèle mathématique
:id sec_math

L'estimation d'état s'appuie sur une formulation discrète du filtre de Kalman étendu (EKF). Le vecteur d'état à l'instant $k$ est noté $x_k \in RR^n$.

L'équation de prédiction de l'état s'écrit :

$$ x_{k|k-1} = F_k x_{k-1|k-1} + B_k u_k $$
:id eq_prediction
:align center

La mise à jour de la matrice de covariance de l'erreur est donnée par :

$$ P_{k|k-1} = F_k P_{k-1|k-1} F_k^T + Q_k $$
:id eq_covariance
:align center

> Attention : la matrice de bruit $Q_k$ doit être symétrique définie positive pour garantir la convergence numérique du filtre.
:type warning

# Implémentation Logicielle
:short Implémentation
:id sec_code

Le cœur de calcul est implémenté en langage **Rust** pour assurer l'absence totale de ramasse-miettes (*garbage collector*) et garantir la sûreté mémoire sans surcoût d'exécution.

```rust
use std::time::Instant;

pub struct TelemetryPipeline {
    buffer_size: usize,
    is_calibrated: bool,
}

impl TelemetryPipeline {
    pub fn process_packet(&mut self, payload: &[u8]) -> Result<Status, Error> {
        let start = Instant::now();
        
        // Traitement vectorisé SIMD
        let state = self.decode_and_filter(payload)?;
        
        println!("Cycle time: {:?}", start.elapsed());
        Ok(state)
    }
}
```
:

> Conseil d'optimisation : Activez les drapeaux de compilation `-C target-cpu=native` pour tirer parti des instructions vectorielles AVX-512 sur cible x86_64.
:type tip

:layout pagebreak

# Évaluation des Performances
:short Performances
:id sec_benchmarks

Les mesures de latence ont été réalisées sur un banc d'essai matériel composé d'un microcontrôleur STM32H7 cadencé à 480 MHz.

| Module | Fréquence | Latence moyenne | Consommation | Statut |
| :--- | :---: | :---: | :---: | :---: |
| Décodage CAN | 1 kHz | $12\ \mu "s"$ | 45 mW | Nominal |
| Filtrage EKF | 500 Hz | $38\ \mu "s"$ | 110 mW | Nominal |
| Chiffrement AES | 100 Hz | $85\ \mu "s"$ | 65 mW | En cours |

:id tbl_perf
:caption Synthèse des métriques d'exécution sur cible embarquée
:compact true

Comme illustré dans le @tbl_perf, la latence cumulée respecte strictement la contrainte budgétaire des $50\ \mu "s"$ définie dans la @sec_intro.

# Conclusion et Perspectives
:short Conclusion
:id sec_conclusion

L'architecture validée en @sec_code répond à l'ensemble des contraintes de performance. Les prochaines étapes porteront sur l'intégration du sous-système de redondance matérielle et la qualification environnementale.
