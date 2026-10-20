import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { readCustomers } from "@/lib/fileDb";
import { toProduct } from "@/lib/products";
import type { Customer } from "@/app/dashboard/actions";

export const dynamic = "force-dynamic";

const isDemoMode =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy") ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("dummy");

const sameMachine = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// Called by the desktop apps: JharLab sends only machineId (= product "pathlab"); MedBilling adds product=medbilling.
// One PC can hold one licence per product.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("machineId");
    const product = toProduct(searchParams.get("product"));

    if (!machineId) {
      return NextResponse.json(
        { success: false, error: "machineId query parameter is required" },
        { status: 400 },
      );
    }

    let rows: Pick<Customer, "machine_id" | "product" | "status" | "expiry_date" | "license_key">[];
    if (isDemoMode) {
      rows = readCustomers().filter((c) => sameMachine(c.machine_id, machineId));
    } else {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        // Case-insensitive exact match (LIKE wildcards escaped), tolerant of how the ID was pasted.
        .ilike("machine_id", machineId.trim().replace(/[\\%_]/g, (c) => `\\${c}`));

      if (error) {
        console.error("Supabase error checking license status:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      rows = data || [];
    }

    // Rows made before the product column existed are JharLab licences.
    const customer = rows.find((c) => toProduct(c.product) === product);
    if (!customer) {
      return NextResponse.json(
        { success: false, status: "DELETED", reason: "Machine ID not registered in database" },
        { status: 404 },
      );
    }

    // If Supabase table doesn't have status, check local fileDb as a fallback
    let status = customer.status;
    if (!status) {
      const fileCust = readCustomers().find(
        (c) => sameMachine(c.machine_id, machineId) && toProduct(c.product) === product,
      );
      status = fileCust?.status || "ACTIVE";
    }

    return NextResponse.json({
      success: true,
      status,
      expiryDate: customer.expiry_date,
      licenseKey: customer.license_key,
    });
  } catch (err: any) {
    console.error("Failed to retrieve license status:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
