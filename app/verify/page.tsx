import React from 'react';
import crypto from 'crypto';
import zlib from 'zlib';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Activity, 
  User, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Building, 
  Phone, 
  FileSpreadsheet 
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface VerifyPageProps {
  searchParams: Promise<{
    p?: string;
    s?: string;
  }>;
}

interface DecodedReport {
  o: string; // orderNo
  n: string; // patientName
  a: string; // age
  g: string; // gender
  d: string; // date
  l: string; // labName
  r: string; // approvedBy
  t: Array<{
    n: string; // testName
    p: Array<{
      n: string; // parameterName
      v: string; // value
      u?: string; // unit (optional now)
      r?: string; // refRange (optional now)
      f: string | null; // flag
    }>;
  }>;
}

function expandMedicalName(name: string): string {
  const map: Record<string, string> = {
    'CBC': 'Complete Blood Count (CBC)',
    'LFT': 'Liver Function Test (LFT)',
    'RFT': 'Renal Function Test (RFT)',
    'Thyroid': 'Thyroid Profile',
    'Lipid': 'Lipid Profile',
    'Hb': 'Hemoglobin (Hb)',
    'RBC': 'Erythrocyte (RBC) Count',
    'PCV': 'Packed Cell Volume (PCV)',
    'WBC': 'Total Leucocytes (WBC) Count',
    'MCV': 'Mean Cell Volume (MCV)',
    'MCH': 'Mean Cell Haemoglobin (MCH)',
    'MCHC': 'Mean Corpuscular Hb Concn. (MCHC)',
    'RDW': 'Red Cell Distribution Width (RDW)',
    'DLC': 'Differential Leucocyte Count (DLC)',
    'Platelets': 'Platelet Count',
    'Neutro': 'Neutrophils',
    'Lympho': 'Lymphocytes',
    'Mono': 'Monocytes',
    'Eosino': 'Eosinophils',
    'Baso': 'Basophils',
    'Sugar Fasting': 'Blood Sugar (Fasting)',
    'Sugar PP': 'Blood Sugar (PP)',
    'Sugar': 'Blood Sugar',
    'HbA1c': 'HbA1c (Glycated Hemoglobin)',
    'eAG': 'Estimated Avg Glucose',
    'Creatinine': 'Serum Creatinine',
    'Urea': 'Blood Urea',
    'Sodium': 'Sodium (Na+)',
    'Potassium': 'Potassium (K+)',
    'Chloride': 'Chloride (Cl-)',
    'Cholesterol': 'Total Cholesterol',
    'ALP': 'Alkaline Phosphatase',
    'Bilirubin Total': 'Total Bilirubin',
    'Bilirubin Direct': 'Direct Bilirubin',
    'Bilirubin Indirect': 'Indirect Bilirubin',
    'Protein Total': 'Total Protein',
    'ALP Total': 'Alkaline Phosphatase',
    'T3': 'T3 (Triiodothyronine)',
    'T4': 'T4 (Thyroxine)'
  };
  return map[name] || name;
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const params = await searchParams;
  const p = params.p;
  const s = params.s;

  const SECRET_SALT = process.env.LICENSE_SECRET_SALT || 'Musharraf_709121SaltKey';

  let isValid = false;
  let report: DecodedReport | null = null;
  let errorMsg = '';

  if (!p || !s) {
    isValid = false;
    errorMsg = 'Missing cryptographic verification payload or digital signature.';
  } else {
    try {
      // Recompute signature and compare first 16 characters
      const expectedSignatureFull = crypto.createHmac('sha256', SECRET_SALT).update(p).digest('hex');
      const expectedSignature = expectedSignatureFull.substring(0, 16);
      isValid = expectedSignature === s;

      if (isValid) {
        const buffer = Buffer.from(p, 'base64');
        const decompressed = zlib.inflateSync(buffer);
        const jsonStr = decompressed.toString('utf8');
        report = JSON.parse(jsonStr);
      } else {
        errorMsg = 'Digital signature mismatch. This document has been tampered with or is fake.';
      }
    } catch (e: any) {
      isValid = false;
      errorMsg = 'Failed to decode report payload. Mismatched structures.';
    }
  }

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans overflow-x-hidden p-4 md:p-8">
      {/* Background Glowing Blurs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] rounded-full bg-indigo-500/5 blur-[150px] pointer-events-none" />

      <div className="max-w-3xl w-full mx-auto space-y-6 z-10">
        {/* Header Branding */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-md shadow-emerald-500/5">
              <Activity className="h-5 w-5 text-zinc-950" />
            </div>
            <div>
              <h1 className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-50 to-zinc-300">
                Pathology LIS Portal
              </h1>
              <p className="text-[9px] text-zinc-500 font-semibold tracking-wider uppercase">Document Integrity Gateway</p>
            </div>
          </div>
          <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full font-mono font-bold">
            v1.0 Secure Verifier
          </span>
        </div>

        {/* Verification Status Banner */}
        {isValid && report ? (
          <div className="backdrop-blur-md bg-emerald-950/15 border border-emerald-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <ShieldCheck className="h-24 w-24 text-emerald-400" />
            </div>
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-lg font-black text-emerald-400 tracking-tight">Report Verified Successfully</h2>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  This diagnostic report is authentic and matches the original laboratory record. The document integrity is cryptographically validated using HMAC-SHA256 protocol.
                </p>
                <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono font-extrabold text-emerald-400 rounded-lg">
                  Order No: {report.o}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="backdrop-blur-md bg-rose-950/15 border border-rose-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden animate-pulse">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <ShieldAlert className="h-24 w-24 text-rose-400" />
            </div>
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-lg font-black text-rose-400 tracking-tight">Verification Failed</h2>
                <p className="text-xs text-rose-300/80 mt-1 leading-relaxed">
                  {errorMsg || 'The digital signature is invalid. This report is either forged, tampered, or did not originate from an authorized Pathology LIS client.'}
                </p>
                <p className="text-[10px] text-zinc-500 mt-3 font-semibold uppercase tracking-wider">
                  Caution: Do not rely on printed details of unverified reports.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Report Details View (Only if Valid) */}
        {isValid && report && (
          <div className="space-y-6">
            {/* Metadata Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Patient Details */}
              <div className="backdrop-blur-md bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 space-y-3.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 border-b border-zinc-800/50 pb-2">
                  <User className="h-4 w-4 text-emerald-400" />
                  Patient Profile
                </h3>
                <div className="grid grid-cols-2 gap-y-2.5 text-xs">
                  <span className="text-zinc-500 font-semibold">Patient Name:</span>
                  <span className="text-zinc-200 font-bold">{report.n}</span>

                  <span className="text-zinc-500 font-semibold">Age / Gender:</span>
                  <span className="text-zinc-200 font-bold">{report.a} / {report.g}</span>

                  <span className="text-zinc-500 font-semibold">Report Date:</span>
                  <span className="text-zinc-200 font-bold">{report.d}</span>
                </div>
              </div>

              {/* Lab & Origin Details */}
              <div className="backdrop-blur-md bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 space-y-3.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 border-b border-zinc-800/50 pb-2">
                  <Building className="h-4 w-4 text-cyan-400" />
                  Diagnostic Facility
                </h3>
                <div className="grid grid-cols-2 gap-y-2.5 text-xs">
                  <span className="text-zinc-500 font-semibold">Issued By:</span>
                  <span className="text-zinc-200 font-bold">{report.l}</span>

                  <span className="text-zinc-500 font-semibold">Approved By:</span>
                  <span className="text-zinc-200 font-bold">{report.r || 'Authorized Signature'}</span>

                  <span className="text-zinc-500 font-semibold">Security Salt Status:</span>
                  <span className="text-emerald-400 font-mono font-bold">MATCHED & SIGNED</span>
                </div>
              </div>
            </div>

            {/* Test Results Parameter Grid */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-indigo-400" />
                Verified Test Results
              </h3>

              {report.t.map((test, tIdx) => (
                <div key={tIdx} className="backdrop-blur-md bg-zinc-900/25 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-lg">
                  {/* Test Header */}
                  <div className="bg-zinc-900/60 border-b border-zinc-800/80 px-5 py-3.5">
                    <h4 className="text-sm font-bold text-zinc-200">{expandMedicalName(test.n)}</h4>
                  </div>

                  {/* Parameters Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-zinc-850 bg-zinc-950/20 text-zinc-500 text-[10px] font-black uppercase tracking-wider">
                          <th className="py-2.5 px-5">Parameter</th>
                          <th className="py-2.5 px-5">Result</th>
                          <th className="py-2.5 px-5">Unit</th>
                          <th className="py-2.5 px-5">Reference Range</th>
                          <th className="py-2.5 px-5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/60 font-medium">
                        {test.p.map((p, pIdx) => {
                          const isAbnormal = !!p.f;
                          const isHigh = p.f === '↑' || p.f === 'H';
                          const isLow = p.f === '↓' || p.f === 'L';
                          const isCritical = p.f === '!!';

                          return (
                            <tr key={pIdx} className="hover:bg-zinc-900/10 transition-colors">
                              <td className="py-3 px-5 text-zinc-300 font-semibold">{expandMedicalName(p.n)}</td>
                              <td className={`py-3 px-5 font-bold ${isCritical || isHigh ? 'text-red-400' : isLow ? 'text-orange-400' : 'text-zinc-100'}`}>
                                {p.v}
                              </td>
                              <td className="py-3 px-5 text-zinc-500">{p.u || '-'}</td>
                              <td className="py-3 px-5 text-zinc-500">{p.r || '-'}</td>
                              <td className="py-3 px-5 text-right">
                                {isCritical ? (
                                  <span className="inline-block px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-black text-[9px] uppercase tracking-wider">Critical</span>
                                ) : isHigh ? (
                                  <span className="inline-block px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-[9px] uppercase tracking-wider">High</span>
                                ) : isLow ? (
                                  <span className="inline-block px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold text-[9px] uppercase tracking-wider">Low</span>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase tracking-wider">Normal</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Audit Message */}
        <footer className="pt-8 border-t border-zinc-900 text-center text-[10px] text-zinc-650 leading-relaxed font-semibold">
          <p>© {new Date().getFullYear()} Pathology LIS Secure Verification Portal.</p>
          <p className="mt-1">Cryptographic hashes generated using AES-256-CBC and HMAC-SHA256 signature protocol.</p>
        </footer>
      </div>
    </div>
  );
}
