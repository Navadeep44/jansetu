import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Mic, Sparkles, Droplets, MapPin, Search, Layers,
  Database, Users, Calculator, Flame, Lightbulb, UserCheck,
  Coins, CheckCircle2, Wrench, Camera, ThumbsUp, TrendingUp,
  Play, Pause, RotateCcw, ChevronRight, ChevronLeft, ArrowRight,
  ShieldAlert, Activity, ExternalLink, Award, FileText, Smartphone
} from 'lucide-react'
import { api } from '../api/client'

const STAGES = [
  {
    id: 1,
    title: 'Citizen',
    subtitle: 'First-Mile Voice & Inclusivity',
    icon: User,
    color: '#3B82F6',
    role: 'Citizen / Resident',
    actor: 'Lakshmi Bai (Resident, Utnoor, Adilabad)',
    channel: 'Voice / WhatsApp / CSC Assisted / Web',
    summary: 'Citizen encounters broken drinking water pipeline leaving 45 families without potable water.',
    liveData: {
      citizen: 'Lakshmi Bai',
      location: 'Ward 4, Utnoor Gram Panchayat, Adilabad District, Telangana',
      phone: '+91 94400 55667',
      channel: 'WhatsApp Voice Note',
      timestamp: '2026-09-30 08:30 IST'
    },
    actionLink: '/report',
    actionText: 'Open Citizen Grievance Portal'
  },
  {
    id: 2,
    title: 'Voice / Text Intake',
    subtitle: 'Omnichannel Grievance Ingestion',
    icon: Mic,
    color: '#8B5CF6',
    role: 'Multichannel Gateway',
    actor: 'JanSetu Voice & Messaging Gateway',
    channel: 'IVR, WhatsApp (+91 90000 11111), Telegram, CSC',
    summary: 'Voice note recorded in native Telugu: "మా ఊరిలో తాగునీటి పైపులైన్ పగిలిపోయింది, 5 రోజులుగా నీళ్లు రావడం లేదు."',
    liveData: {
      rawAudio: 'voice_note_utnoor_tg_0930.opus',
      duration: '8.4 seconds',
      sampleRate: '16 kHz mono',
      sourceChannel: 'WhatsApp Bot (Webhook Ingest)'
    },
    actionLink: '/channels',
    actionText: 'Test Omnichannel Simulator'
  },
  {
    id: 3,
    title: 'AI Understands Language',
    subtitle: 'Multilingual ASR & Bhashini AI Engine',
    icon: Sparkles,
    color: '#EC4899',
    role: 'AI Understanding Engine',
    actor: 'Bhashini / Whisper / IndicLLM Pipeline',
    channel: 'Automated Language Detection',
    summary: 'Zero-shot language detection identifies Telugu (Confidence 0.99) and transcribes/translates faithfully into English.',
    liveData: {
      detectedLanguage: 'Telugu (te)',
      confidence: '99.4%',
      transcriptTelugu: 'మా వార్డులో తాగునీటి పైపులైన్ పగిలిపోయింది, 5 రోజులుగా నీళ్లు రావడం లేదు, మహిళలు ఇబ్బంది పడుతున్నారు',
      translatedEnglish: 'Drinking water pipeline damaged in our ward, no water supply for 5 days, women and families severely affected.',
      nativeSummary: 'జనసేతు గ్రహించినది: తాగునీటి సమస్య (పైపులైన్ మరమ్మతు). అంచనా తీవ్రత: 4/5.'
    },
    actionLink: '/report',
    actionText: 'Try AI Live Preview'
  },
  {
    id: 4,
    title: 'Category = Water',
    subtitle: 'Taxonomy & Severity Classification',
    icon: Droplets,
    color: '#0EA5E9',
    role: 'Classification Classifier',
    actor: 'Rule-Engine + Semantic LLM Extraction',
    channel: 'Classification Pipeline',
    summary: 'Mapped to Sector: Water (SDG 6: Clean Water & Sanitation), Subcategory: supply_shortage / pipeline_repair, Severity: 4/5.',
    liveData: {
      sector: 'Water (SDG 6.1)',
      subcategory: 'supply_shortage / pipe_damage',
      requestType: 'repair',
      severity: '4 / 5 (Health risk flagged)',
      sdgAlignment: 'UN SDG 6: Safe & Affordable Drinking Water',
      vulnerableGroups: ['women', 'children']
    },
    actionLink: '/dashboard',
    actionText: 'View Sector Breakdown'
  },
  {
    id: 5,
    title: 'Location Detected',
    subtitle: 'Spatial Gazetteer & Geo-Resolution',
    icon: MapPin,
    color: '#10B981',
    role: 'Geo-Intelligence',
    actor: 'Gazetteer & Reverse Geocoder',
    channel: 'Spatial Disaggregation Engine',
    summary: 'Matched mentioned place "Utnoor" with GIS Gazetteer ID #12 (Adilabad District, Telangana) at [19.3667, 78.7833].',
    liveData: {
      areaId: 12,
      areaName: 'Utnoor',
      district: 'Adilabad',
      state: 'Telangana',
      country: 'India (IN)',
      coordinates: '19.3667° N, 78.7833° E',
      setting: 'Rural / Tribal Gram Panchayat'
    },
    actionLink: '/dashboard',
    actionText: 'Inspect GIS Map'
  },
  {
    id: 6,
    title: 'Similar Requests Found',
    subtitle: 'Vector Semantic Matching & Deduplication',
    icon: Search,
    color: '#F59E0B',
    role: 'Anti-Duplication Engine',
    actor: 'Locality-Sensitive Hashing & Vector Search',
    channel: 'Aggregation Layer',
    summary: 'Discovered 14 matching complaints within 800m radius over the past 7 days from different households.',
    liveData: {
      searchRadius: '800 meters',
      timeWindow: 'Last 14 days',
      matchedGrievances: 14,
      uniqueHouseholds: 14,
      antiGamingCheck: 'PASSED (Distinct household hashes, no coordinated bot spam)'
    },
    actionLink: '/clusters',
    actionText: 'View Similar Cluster'
  },
  {
    id: 7,
    title: 'Demand Cluster Created',
    subtitle: 'From Individual Complaints to Collective Need',
    icon: Layers,
    color: '#6366F1',
    role: 'Collective Intelligence',
    actor: 'JanSetu Aggregation System',
    channel: 'Cluster Synthesis',
    summary: 'Cluster #1090 established: "Drinking water supply disrupted in Utnoor Ward 4". Single collective asset need.',
    liveData: {
      clusterId: '#1090',
      title: 'Drinking water pipeline failure in Utnoor',
      supportingHouseholds: '45 Families (180+ Residents)',
      languagesRepresented: ['Telugu', 'Gondi', 'Hindi'],
      assignedTrackingId: 'JS-IN-A7BK39XM4D'
    },
    actionLink: '/clusters',
    actionText: 'Explore Demand Clusters'
  },
  {
    id: 8,
    title: 'Infrastructure Data Added',
    subtitle: 'Supply-Side Baseline Fusion',
    icon: Database,
    color: '#84CC16',
    role: 'Open Data Integrator',
    actor: 'Jal Jeevan Mission / Mission Bhagiratha Data API',
    channel: 'Government Infrastructure DB',
    summary: 'Fused with local water supply assets: 1 overhead reservoir, 2 tube wells, current operational deficit: 68%.',
    liveData: {
      existingAssets: '1 Overhead Tank (50kL), 2 Handpumps (1 non-functional)',
      pipedSupplyCoverage: '32% (Deficit: 68%)',
      perCapitaAvailability: '22 Litres/day (Target: 55 LPCD)',
      sourceReliability: 'High seasonal depletion'
    },
    actionLink: '/brief',
    actionText: 'Read Infrastructure Brief'
  },
  {
    id: 9,
    title: 'Demographic Data Added',
    subtitle: 'Vulnerability & Census Integration',
    icon: Users,
    color: '#14B8A6',
    role: 'Demographic Engine',
    actor: 'Census 2021 / Socio-Economic Registry',
    channel: 'Demographic Baselines',
    summary: 'Area Census data added: Population 4,200, Vulnerability Index 0.82 (High tribal & agrarian population ratio).',
    liveData: {
      totalPopulation: '4,200',
      vulnerabilityIndex: '0.82 / 1.0 (High)',
      femaleRatio: '51.4%',
      childPopulationUnder6: '580',
      connectivityIndex: '42% (Low digital connectivity)'
    },
    actionLink: '/dashboard',
    actionText: 'View Vulnerability Map'
  },
  {
    id: 10,
    title: 'Need-Gap Index Calculated',
    subtitle: 'Mathematical Triangulation of Demand & Supply',
    icon: Calculator,
    color: '#F97316',
    role: 'Need-Gap Scoring Algorithm',
    actor: 'JanSetu NGI Econometric Model',
    channel: 'Prioritization Engine',
    summary: 'Computed Need-Gap Index: NGI = 84.6 / 100. High severity, severe supply deficit, and high vulnerability.',
    liveData: {
      formula: 'NGI = 0.40 × Deficit + 0.35 × Demand + 0.25 × Vulnerability',
      deficitScore: '68.0 × 0.40 = 27.2',
      demandScore: '92.5 × 0.35 = 32.4',
      vulnerabilityScore: '82.0 × 0.25 = 20.5',
      finalNGI: '84.6 / 100 (Top 5% Priority across District)'
    },
    actionLink: '/priorities',
    actionText: 'Test Weight Sliders'
  },
  {
    id: 11,
    title: 'Hotspot / Silent Zone Analysis',
    subtitle: 'Spatial Getis-Ord Gi* & Exclusion Detection',
    icon: Flame,
    color: '#EF4444',
    role: 'Spatial Econometrics',
    actor: 'Spatial Hotspot & Silent Zone Detector',
    channel: 'GIS Intelligence',
    summary: 'Identified as Active Hotspot (Z-score 3.42, p < 0.001). Adjacent tribal thanda marked as "Silent Zone" (high need, zero digital voice).',
    liveData: {
      spatialClusterType: 'High-High Hotspot (99% Confidence)',
      zScore: '+3.42 (Statistically significant cluster)',
      silentZoneRisk: 'Detected: Adjacent Kolam thanda has zero reports due to network gap',
      proactiveOutreach: 'CSC / ASHA field survey triggered'
    },
    actionLink: '/dashboard',
    actionText: 'View Spatial Hotspots'
  },
  {
    id: 12,
    title: 'AI Proposes Project',
    subtitle: 'Budget Scheme Convergence & Automated Proposal',
    icon: Lightbulb,
    color: '#A855F7',
    role: 'AI Project Architect',
    actor: 'JanSetu Policy Recommender',
    channel: 'Automated Project Formulation',
    summary: 'AI formulates project: "Piped drinking water distribution & pipeline rehabilitation in Utnoor Ward 4" (Est: ₹18.5 Lakhs under Jal Jeevan Mission).',
    liveData: {
      projectCode: 'REC-IN-012-WAT',
      title: 'Piped drinking-water scheme & pipeline repair, Utnoor',
      estimatedBudget: '₹18,50,000 ($22,200 USD)',
      schemeConvergence: 'Jal Jeevan Mission + 15th Finance Commission Tied Grant',
      estimatedBeneficiaries: '4,200 citizens',
      sdgTarget: 'SDG 6.1 (Universal access to safe water)'
    },
    actionLink: '/projects',
    actionText: 'View Recommended Project'
  },
  {
    id: 13,
    title: 'District Officer Reviews',
    subtitle: 'Explainable AI Evidence Dossier & Accountability',
    icon: UserCheck,
    color: '#3B82F6',
    role: 'District Administration',
    actor: 'District Collector Anitha Rao, IAS / District Officer Patil',
    channel: 'Officer Workspace',
    summary: 'District Officer inspects citizen quotes, geo-cluster breakdown, and NGI justification on Officer Dashboard.',
    liveData: {
      reviewingOfficial: 'District Collector & Magistrate, Adilabad',
      dossierStatus: 'AI Evidence Verified',
      citizenQuotesReviewed: '14 verifiable audio transcripts',
      departmentNotified: 'Mission Bhagiratha / Rural Water Supply (RWS)'
    },
    actionLink: '/officer',
    actionText: 'Go to Officer Workspace'
  },
  {
    id: 14,
    title: 'Budget Considered',
    subtitle: '0/1 Knapsack Fiscal Optimization',
    icon: Coins,
    color: '#EAB308',
    role: 'Budget Optimizer',
    actor: 'Knapsack Portfolio Allocation Engine',
    channel: 'Financial Planning',
    summary: 'Optimizes ₹2.50 Cr district water budget. Project selected as #1 return-on-investment per beneficiary.',
    liveData: {
      districtBudgetPool: '₹2,50,00,000',
      projectCost: '₹18,50,000 (7.4% of fund)',
      costPerBeneficiary: '₹440 / person',
      knapsackDecision: 'OPTIMAL (Selected in Tier 1 Portfolio)',
      fundUtilization: '98.6% efficiency'
    },
    actionLink: '/projects',
    actionText: 'Run Budget Knapsack'
  },
  {
    id: 15,
    title: 'Project Sanctioned',
    subtitle: 'Cryptographic Audit Trail & Work Order',
    icon: CheckCircle2,
    color: '#10B981',
    role: 'Sanctioning Authority',
    actor: 'State Water Authority & District Collectorate',
    channel: 'Governance & Audit Chain',
    summary: 'Official Administrative Sanction AS-2026-RWS-093 issued. All 45 complaining households notified via WhatsApp/SMS.',
    liveData: {
      sanctionNumber: 'AS-2026-RWS-093',
      sanctionDate: '2026-09-30',
      contractorAssigned: 'District Water Works Division',
      auditHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      citizensNotified: '45 households received approval SMS in Telugu'
    },
    actionLink: '/trust',
    actionText: 'Verify Cryptographic Audit'
  },
  {
    id: 16,
    title: 'Field Officer Executes',
    subtitle: 'On-Ground Redressal & SLA Monitoring',
    icon: Wrench,
    color: '#6366F1',
    role: 'Field Execution',
    actor: 'Assistant Engineer Ravi Teja (Utnoor Block)',
    channel: 'Field Officer Mobile App',
    summary: 'Field team replaces 120m fractured PVC pipeline, repairs pump control valve, and tests chlorinated water flow.',
    liveData: {
      assignedFieldOfficer: 'Ravi Teja (AE, RWS Utnoor)',
      workStatus: 'Physical Works Completed',
      slaTimeTaken: '48 Hours (Within 72-hour emergency SLA)',
      materialsUsed: '120m High-Density Polyethylene Pipe, 1 Gate Valve'
    },
    actionLink: '/officer',
    actionText: 'View Field Queue'
  },
  {
    id: 17,
    title: 'Geo-Tagged Proof Uploaded',
    subtitle: 'Tamper-Evident Photographic Evidence',
    icon: Camera,
    color: '#06B6D4',
    role: 'Evidence Verification',
    actor: 'Field Engineer with GPS Camera',
    channel: 'Proof Upload Verification',
    summary: 'Officer uploads before/after photos with EXIF timestamp, SHA-256 integrity hash, and GPS coordinates [19.3667, 78.7833].',
    liveData: {
      proofFile: 'proof_utnoor_water_restored.jpg',
      gpsCoordinates: '19.36671° N, 78.78328° E (Match score: 99.8%)',
      timestamp: '2026-09-30 14:15 IST',
      sha256Hash: 'a71b29d...59c1',
      antiFraudCheck: 'PASSED (Genuine live photo, no duplicate image fingerprint)'
    },
    actionLink: '/track',
    actionText: 'Inspect Proof of Resolution'
  },
  {
    id: 18,
    title: 'Citizen Verifies',
    subtitle: 'Closed-Loop Verification & Anti-Formulaic Defense',
    icon: ThumbsUp,
    color: '#10B981',
    role: 'Citizen Confirmation',
    actor: 'Lakshmi Bai (Original Complainant)',
    channel: 'One-Tap SMS / WhatsApp / Web',
    summary: 'Citizen receives SMS: "Is your water restored?". Citizen replies "Yes, clean water is now flowing daily". Rating: 5/5.',
    liveData: {
      verificationStatus: 'CONFIRMED FIXED BY CITIZEN',
      rating: '5 / 5 Stars',
      citizenFeedback: 'మా వీధిలో పైపు సరిచేశారు, ఇప్పుడు రోజూ శుభ్రమైన నీరు వస్తోంది. ధన్యవాదాలు.',
      reopenRisk: 'Zero (No dispute filed within 15-day window)'
    },
    actionLink: '/results',
    actionText: 'View Public Board'
  },
  {
    id: 19,
    title: 'Impact Measured',
    subtitle: 'Econometric Difference-in-Differences (DiD)',
    icon: TrendingUp,
    color: '#8B5CF6',
    role: 'Impact Evaluation',
    actor: 'Econometric Policy Evaluation Engine',
    channel: 'Post-Intervention Analytics',
    summary: 'Econometric evaluation: β_DiD = -0.42 drop in water deficit; 94% reduction in recurring complaints; SDG 6.1 advanced.',
    liveData: {
      betaDiD: '-0.420 (p < 0.001, Statistically Significant)',
      postNeedGap: 'Reduced from 84.6 to 18.2 (-66.4 pts)',
      complaintsResolved: '100% Verified in Ward 4',
      beneficiariesServed: '4,200 citizens with safe tap water',
      publicTrustIndex: '+38% increase in civic satisfaction'
    },
    actionLink: '/impact',
    actionText: 'Explore Impact Analytics'
  }
]

export default function Pipeline() {
  const [activeStep, setActiveStep] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(3500)
  const timerRef = useRef(null)

  const currentStage = STAGES[activeStep - 1]

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setActiveStep((prev) => {
          if (prev >= STAGES.length) {
            setIsPlaying(false)
            return 1
          }
          return prev + 1
        })
      }, speed)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [isPlaying, speed])

  const handleNext = () => {
    if (activeStep < STAGES.length) setActiveStep(activeStep + 1)
  }

  const handlePrev = () => {
    if (activeStep > 1) setActiveStep(activeStep - 1)
  }

  return (
    <div className="content pipeline-page" style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 999, background: 'rgba(59, 130, 246, 0.1)', color: '#2563EB', fontWeight: 600, fontSize: '0.875rem', marginBottom: 12 }}>
          <Sparkles size={16} /> End-to-End Civic Redressal & Policy Intelligence Lifecycle
        </div>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
          From Citizen Voice to Measurable Impact
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#64748B', maxWidth: 780, margin: '0 auto' }}>
          Watch how JanSetu turns raw multilingual speech into collective demand clusters, prioritized public works, geo-tagged resolution proofs, and econometric impact.
        </p>
      </div>

      {/* Control Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, background: 'var(--surface, #FFFFFF)', padding: '16px 20px', borderRadius: 16, border: '1px solid var(--border, #E2E8F0)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              borderRadius: 10,
              background: isPlaying ? '#EF4444' : '#2563EB',
              color: '#FFF',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(37,99,235,0.25)'
            }}
          >
            {isPlaying ? <><Pause size={18} /> Pause Walkthrough</> : <><Play size={18} /> Auto-Play 18 Steps</>}
          </button>
          <button
            onClick={() => { setIsPlaying(false); setActiveStep(1); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'var(--bg, #F8FAFC)', border: '1px solid var(--border, #E2E8F0)', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
          >
            <RotateCcw size={16} /> Reset
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#64748B' }}>
            <span>Speed:</span>
            {[5000, 3500, 2000].map((s, idx) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border, #E2E8F0)',
                  background: speed === s ? '#2563EB' : 'transparent',
                  color: speed === s ? '#FFF' : '#64748B',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                {idx === 0 ? 'Slow' : idx === 1 ? 'Normal' : 'Fast'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>
            Stage {activeStep} of {STAGES.length}
          </span>
          <button
            onClick={handlePrev}
            disabled={activeStep <= 1}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border, #E2E8F0)', background: activeStep <= 1 ? '#F1F5F9' : '#FFF', color: activeStep <= 1 ? '#94A3B8' : '#334155', cursor: activeStep <= 1 ? 'not-allowed' : 'pointer' }}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={handleNext}
            disabled={activeStep >= STAGES.length}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border, #E2E8F0)', background: activeStep >= STAGES.length ? '#F1F5F9' : '#FFF', color: activeStep >= STAGES.length ? '#94A3B8' : '#334155', cursor: activeStep >= STAGES.length ? 'not-allowed' : 'pointer' }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Horizontal Steps Navigator Bar */}
      <div style={{ overflowX: 'auto', paddingBottom: 12, marginBottom: 28 }}>
        <div style={{ display: 'flex', gap: 6, minWidth: 1080 }}>
          {STAGES.map((st) => {
            const IconComponent = st.icon
            const isActive = st.id === activeStep
            const isCompleted = st.id < activeStep
            return (
              <button
                key={st.id}
                onClick={() => { setIsPlaying(false); setActiveStep(st.id); }}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '10px 4px',
                  borderRadius: 10,
                  border: isActive ? `2px solid ${st.color}` : '1px solid var(--border, #E2E8F0)',
                  background: isActive ? `${st.color}15` : isCompleted ? '#F8FAFC' : '#FFF',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  minWidth: 54
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isActive ? st.color : isCompleted ? '#10B981' : '#E2E8F0',
                    color: isActive || isCompleted ? '#FFF' : '#64748B',
                    marginBottom: 4
                  }}
                >
                  {isCompleted ? <CheckCircle2 size={16} /> : <IconComponent size={14} />}
                </div>
                <span style={{ fontSize: '0.65rem', fontWeight: isActive ? 700 : 500, color: isActive ? st.color : '#64748B', whiteSpace: 'nowrap', textAlign: 'center', maxWidth: 52, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {st.id}. {st.title.split(' ')[0]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Showcase Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStage.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          style={{
            background: 'var(--surface, #FFFFFF)',
            borderRadius: 20,
            border: '1px solid var(--border, #E2E8F0)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            overflow: 'hidden',
            marginBottom: 32
          }}
        >
          {/* Card Banner */}
          <div style={{ background: `linear-gradient(135deg, ${currentStage.color}15, ${currentStage.color}05)`, borderBottom: `2px solid ${currentStage.color}30`, padding: '24px 28px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: currentStage.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', boxShadow: `0 4px 12px ${currentStage.color}40` }}>
                {(() => { const I = currentStage.icon; return <I size={28} /> })()}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ background: currentStage.color, color: '#FFF', padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 800 }}>
                    STAGE {currentStage.id} OF {STAGES.length}
                  </span>
                  <span style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600 }}>
                    {currentStage.role}
                  </span>
                </div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                  {currentStage.title}
                </h2>
                <div style={{ fontSize: '0.95rem', color: '#64748B', marginTop: 2 }}>
                  {currentStage.subtitle}
                </div>
              </div>
            </div>

            <Link
              to={currentStage.actionLink}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 10,
                background: currentStage.color,
                color: '#FFF',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: `0 3px 10px ${currentStage.color}30`
              }}
            >
              {currentStage.actionText} <ExternalLink size={16} />
            </Link>
          </div>

          {/* Card Body */}
          <div style={{ padding: '28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            {/* Left Column: Narrative & Context */}
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={18} color={currentStage.color} /> What Happens in This Stage
              </h3>
              <p style={{ fontSize: '1.05rem', lineHeight: 1.6, color: '#334155', background: '#F8FAFC', padding: '16px 18px', borderRadius: 12, border: '1px solid #E2E8F0', margin: '0 0 20px 0' }}>
                {currentStage.summary}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: '#FFF', padding: '12px 14px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Primary Actor</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1E293B', marginTop: 2 }}>{currentStage.actor}</div>
                </div>
                <div style={{ background: '#FFF', padding: '12px 14px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Channel / Interface</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1E293B', marginTop: 2 }}>{currentStage.channel}</div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Data Inspector */}
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Database size={18} color={currentStage.color} /> Live Pipeline State & Telemetry
              </h3>
              <div style={{ background: '#0F172A', color: '#F8FAFC', padding: '18px 20px', borderRadius: 14, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '0.85rem', lineHeight: 1.6, boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.3)', overflowX: 'auto' }}>
                <div style={{ color: '#94A3B8', borderBottom: '1px solid #334155', paddingBottom: 6, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
                  <span>STATE INSPECTOR // STAGE_{currentStage.id}</span>
                  <span style={{ color: '#10B981' }}>● LIVE EXECUTION</span>
                </div>
                {Object.entries(currentStage.liveData).map(([k, v]) => (
                  <div key={k} style={{ marginBottom: 6, display: 'flex', gap: 8 }}>
                    <span style={{ color: '#38BDF8', minWidth: 160 }}>{k}:</span>
                    <span style={{ color: Array.isArray(v) ? '#FCD34D' : typeof v === 'number' ? '#A7F3D0' : '#F1F5F9' }}>
                      {Array.isArray(v) ? JSON.stringify(v) : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Navigation */}
          <div style={{ padding: '16px 28px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={handlePrev}
              disabled={activeStep <= 1}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: activeStep <= 1 ? 'transparent' : '#FFF', color: activeStep <= 1 ? '#CBD5E1' : '#334155', fontWeight: 600, cursor: activeStep <= 1 ? 'not-allowed' : 'pointer' }}
            >
              <ChevronLeft size={16} /> Previous: {activeStep > 1 ? STAGES[activeStep - 2].title : 'Start'}
            </button>

            <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
              Step {activeStep} of {STAGES.length} in End-to-End Pipeline
            </span>

            <button
              onClick={handleNext}
              disabled={activeStep >= STAGES.length}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: activeStep >= STAGES.length ? '#CBD5E1' : '#2563EB', color: '#FFF', fontWeight: 600, border: 'none', cursor: activeStep >= STAGES.length ? 'not-allowed' : 'pointer' }}
            >
              Next: {activeStep < STAGES.length ? STAGES[activeStep].title : 'Complete'} <ChevronRight size={16} />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Complete Architecture Grid Overview */}
      <div style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 16px 0', textAlign: 'center' }}>
          Full 18-Stage Architecture Map
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {STAGES.map((st) => {
            const Icon = st.icon
            const isSelected = st.id === activeStep
            return (
              <div
                key={st.id}
                onClick={() => { setIsPlaying(false); setActiveStep(st.id); }}
                style={{
                  background: isSelected ? `${st.color}10` : 'var(--surface, #FFFFFF)',
                  border: isSelected ? `2px solid ${st.color}` : '1px solid var(--border, #E2E8F0)',
                  borderRadius: 14,
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  boxShadow: isSelected ? `0 4px 14px ${st.color}25` : '0 1px 3px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: st.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: st.color }}>STAGE {st.id}</span>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1E293B' }}>{st.title}</h4>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B', lineHeight: 1.4 }}>
                  {st.subtitle}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
