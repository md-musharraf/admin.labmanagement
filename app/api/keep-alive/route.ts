import { GET as cronGET, POST as cronPOST } from '../cron/keep-alive/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  return cronGET(request);
}

export async function POST(request: Request) {
  return cronPOST(request);
}
