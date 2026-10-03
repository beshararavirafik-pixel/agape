import { State, RecordItem, uid } from "./model";
export function savePlanningRecord(
  state: State,
  record: RecordItem,
  vendorName = "",
): State {
  let records = [...state.records];
  if (record.kind === "budget") {
    if (!vendorName.trim()) throw new Error("Vendor name is required");
    let vendor = records.find(
      (v) =>
        v.kind === "vendor" &&
        v.title.toLowerCase() === vendorName.trim().toLowerCase(),
    );
    if (!vendor) {
      vendor = {
        ...record,
        id: uid(),
        kind: "vendor",
        title: vendorName.trim(),
        vendor_id: null,
        details: {},
      };
      records.push(vendor);
    }
    record = { ...record, vendor_id: vendor.id };
  }
  const found = records.some((r) => r.id === record.id);
  records = found
    ? records.map((r) => (r.id === record.id ? record : r))
    : [...records, record];
  if (record.kind === "vendor") {
    const linked = records.filter(
      (r) => r.kind === "budget" && r.vendor_id === record.id,
    );
    if (linked.length) {
      const total = linked.reduce((n, r) => n + r.amount, 0),
        paid = linked.reduce((n, r) => n + r.paid, 0);
      let remaining = record.amount,
        remainingPaid = record.paid;
      records = records.map((r) => {
        const index = linked.findIndex((a) => a.id === r.id);
        if (index < 0) return r;
        const amount =
          index === linked.length - 1
            ? remaining
            : Math.round(
                (total ? r.amount / total : 1 / linked.length) *
                  record.amount *
                  100,
              ) / 100;
        const nextPaid =
          index === linked.length - 1
            ? remainingPaid
            : Math.round(
                (paid ? r.paid / paid : 1 / linked.length) * record.paid * 100,
              ) / 100;
        remaining -= amount;
        remainingPaid -= nextPaid;
        return { ...r, amount, paid: nextPaid };
      });
    } else
      records.push({
        ...record,
        id: uid(),
        kind: "budget",
        vendor_id: record.id,
        details: {},
        title: record.title,
      });
  }
  if (["budget", "vendor"].includes(record.kind)) {
    records = records.map((v) => {
      if (v.kind !== "vendor") return v;
      const linked = records.filter(
        (r) => r.kind === "budget" && r.vendor_id === v.id,
      );
      if (!linked.length) return v;
      return {
        ...v,
        amount: linked.reduce((n, r) => n + r.amount, 0),
        paid: linked.reduce((n, r) => n + r.paid, 0),
      };
    });
  }
  return { ...state, records };
}
