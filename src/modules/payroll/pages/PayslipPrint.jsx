import { useRef } from "react";
import { Printer, X } from "lucide-react";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const toWords = (num) => {
    const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
        "Seventeen", "Eighteen", "Nineteen"];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const inWords = (n) => {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
        if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + inWords(n % 100) : "");
        if (n < 100000) return inWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + inWords(n % 1000) : "");
        if (n < 10000000) return inWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + inWords(n % 100000) : "");
        return inWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + inWords(n % 10000000) : "");
    };
    const n = Math.floor(num);
    return n === 0 ? "Zero" : inWords(n) + " Rupees Only";
};

const monthLabel = (m) => {
    if (!m) return "";
    const [y, mo] = m.split("-");
    return new Date(y, mo - 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
};

const PayslipPrint = ({ run, company, onClose }) => {
    const printRef = useRef();

    const handlePrint = () => {
        const content = printRef.current.innerHTML;
        const win = window.open("", "_blank", "width=900,height=700");
        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Payslip - ${run.month}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: #fff; }
                    .payslip { width: 794px; margin: 0 auto; padding: 32px; border: 1px solid #ccc; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1e3a5f; padding-bottom: 12px; margin-bottom: 16px; }
                    .company-name { font-size: 18px; font-weight: 700; color: #1e3a5f; }
                    .company-sub { font-size: 11px; color: #555; margin-top: 2px; }
                    .payslip-title { text-align: right; }
                    .payslip-title h2 { font-size: 14px; font-weight: 700; color: #1e3a5f; text-transform: uppercase; letter-spacing: 1px; }
                    .payslip-title p { font-size: 11px; color: #555; margin-top: 2px; }
                    .section-title { background: #1e3a5f; color: #fff; font-size: 11px; font-weight: 700; padding: 5px 10px; text-transform: uppercase; letter-spacing: 0.5px; margin: 14px 0 6px; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; }
                    .info-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dotted #ddd; font-size: 11.5px; }
                    .info-row span:first-child { color: #555; }
                    .info-row span:last-child { font-weight: 600; }
                    .attend-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; margin: 6px 0; }
                    .attend-box { border: 1px solid #ddd; border-radius: 4px; padding: 6px; text-align: center; }
                    .attend-box .val { font-size: 14px; font-weight: 700; color: #1e3a5f; }
                    .attend-box .lbl { font-size: 10px; color: #777; margin-top: 2px; }
                    table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
                    th { background: #f0f4f8; color: #333; font-weight: 700; padding: 6px 10px; text-align: left; border: 1px solid #ddd; }
                    td { padding: 5px 10px; border: 1px solid #ddd; }
                    .text-right { text-align: right; }
                    .total-row td { font-weight: 700; background: #f8f9fa; }
                    .net-box { background: #1e3a5f; color: #fff; padding: 12px 16px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin: 14px 0; }
                    .net-box .label { font-size: 13px; font-weight: 700; }
                    .net-box .amount { font-size: 20px; font-weight: 700; }
                    .words { font-size: 11px; color: #444; margin-bottom: 14px; font-style: italic; }
                    .footer { display: flex; justify-content: space-between; margin-top: 32px; padding-top: 12px; border-top: 1px solid #ddd; }
                    .sig-block { text-align: center; }
                    .sig-line { border-top: 1px solid #333; width: 160px; margin: 28px auto 4px; }
                    .sig-label { font-size: 11px; color: #555; }
                    .notice { font-size: 10px; color: #888; text-align: center; margin-top: 14px; border-top: 1px solid #eee; padding-top: 8px; }
                    .green { color: #166534; }
                    .red { color: #991b1b; }
                </style>
            </head>
            <body>${content}</body>
            </html>
        `);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); win.close(); }, 400);
    };

    if (!run) return null;

    const earnings   = run.components?.filter(c => c.type === "earning")  || [];
    const deductions = run.components?.filter(c => c.type === "deduction") || [];
    const maxRows    = Math.max(earnings.length, deductions.length);
    const emp        = run.userId || {};

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
            {/* Toolbar */}
            <div className="absolute top-4 right-4 flex gap-2 z-10">
                <button onClick={handlePrint}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow">
                    <Printer size={15} /> Print / Download PDF
                </button>
                <button onClick={onClose}
                    className="p-2 bg-white hover:bg-gray-100 text-gray-600 rounded-lg shadow">
                    <X size={16} />
                </button>
            </div>

            {/* Payslip Preview */}
            <div ref={printRef} className="payslip bg-white w-[794px] p-8 shadow-2xl rounded-lg mt-12 mb-6"
                style={{ fontFamily: "Arial, sans-serif", fontSize: "12px", color: "#111" }}>

                {/* Header */}
                <div className="header flex justify-between items-start border-b-2 border-[#1e3a5f] pb-3 mb-4">
                    <div>
                        <div className="company-name text-[18px] font-bold text-[#1e3a5f]">
                            {company?.name || "Company Name"}
                        </div>
                        <div className="company-sub text-[11px] text-gray-500 mt-0.5">
                            {company?.address || "Company Address"}
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-[14px] font-bold text-[#1e3a5f] uppercase tracking-wide">Salary Slip</h2>
                        <p className="text-[11px] text-gray-500 mt-0.5">For the month of {monthLabel(run.month)}</p>
                        <p className="text-[11px] text-gray-400">Confidential</p>
                    </div>
                </div>

                {/* Employee Details */}
                <div className="section-title bg-[#1e3a5f] text-white text-[11px] font-bold px-2.5 py-1 uppercase tracking-wide mb-1.5">
                    Employee Details
                </div>
                <div className="info-grid grid grid-cols-2 gap-x-6 gap-y-0.5">
                    {[
                        ["Employee Name",   `${emp.firstName || ""} ${emp.lastName || ""}`.trim()],
                        ["Employee Code",   emp.employeeCode || "—"],
                        ["Department",      emp.department?.name || "—"],
                        ["Designation",     emp.designation?.name || "—"],
                        ["Date of Joining", emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString("en-IN") : "—"],
                        ["Pay Period",      monthLabel(run.month)],
                        ...(emp.address ? [["Address", emp.address]] : []),
                    ].map(([label, value]) => (
                        <div key={label} className="info-row flex justify-between py-1 border-b border-dotted border-gray-200 text-[11.5px]">
                            <span className="text-gray-500">{label}</span>
                            <span className="font-semibold">{value}</span>
                        </div>
                    ))}
                </div>

                {/* Attendance Summary */}
                <div className="section-title bg-[#1e3a5f] text-white text-[11px] font-bold px-2.5 py-1 uppercase tracking-wide mt-3 mb-1.5">
                    Attendance Summary
                </div>
                <div className="attend-grid grid grid-cols-6 gap-1.5 my-1.5">
                    {[
                        { label: "Working Days", value: run.totalWorkingDays },
                        { label: "Present",      value: run.presentDays },
                        { label: "Absent",       value: run.absentDays },
                        { label: "Half Days",    value: run.halfDays },
                        { label: "Paid Leave",   value: run.paidLeaveDays },
                        { label: "LOP Days",     value: run.lopDays },
                    ].map(({ label, value }) => (
                        <div key={label} className="border border-gray-200 rounded p-1.5 text-center">
                            <div className="text-[14px] font-bold text-[#1e3a5f]">{value}</div>
                            <div className="text-[10px] text-gray-500 mt-0.5">{label}</div>
                        </div>
                    ))}
                </div>

                {/* Earnings & Deductions Table */}
                <div className="section-title bg-[#1e3a5f] text-white text-[11px] font-bold px-2.5 py-1 uppercase tracking-wide mt-3 mb-1.5">
                    Earnings &amp; Deductions
                </div>
                <table className="w-full border-collapse text-[11.5px]">
                    <thead>
                        <tr>
                            <th className="bg-[#f0f4f8] text-gray-700 font-bold px-2.5 py-1.5 text-left border border-gray-300">Earnings</th>
                            <th className="bg-[#f0f4f8] text-gray-700 font-bold px-2.5 py-1.5 text-right border border-gray-300">Amount (₹)</th>
                            <th className="bg-[#f0f4f8] text-gray-700 font-bold px-2.5 py-1.5 text-left border border-gray-300">Deductions</th>
                            <th className="bg-[#f0f4f8] text-gray-700 font-bold px-2.5 py-1.5 text-right border border-gray-300">Amount (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: maxRows }).map((_, i) => (
                            <tr key={i}>
                                <td className="px-2.5 py-1 border border-gray-200 text-gray-700">{earnings[i]?.name || ""}</td>
                                <td className="px-2.5 py-1 border border-gray-200 text-right text-green-700 font-medium">
                                    {earnings[i] ? fmt(earnings[i].amount) : ""}
                                </td>
                                <td className="px-2.5 py-1 border border-gray-200 text-gray-700">{deductions[i]?.name || ""}</td>
                                <td className="px-2.5 py-1 border border-gray-200 text-right text-red-600 font-medium">
                                    {deductions[i] ? fmt(deductions[i].amount) : ""}
                                </td>
                            </tr>
                        ))}
                        {/* Totals row */}
                        <tr className="bg-gray-50 font-bold">
                            <td className="px-2.5 py-1.5 border border-gray-300">Gross Earnings</td>
                            <td className="px-2.5 py-1.5 border border-gray-300 text-right text-green-700">{fmt(run.grossEarnings)}</td>
                            <td className="px-2.5 py-1.5 border border-gray-300">Total Deductions</td>
                            <td className="px-2.5 py-1.5 border border-gray-300 text-right text-red-600">{fmt(run.totalDeductions)}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Net Salary */}
                <div className="net-box flex justify-between items-center bg-[#1e3a5f] text-white px-4 py-3 rounded-md mt-3">
                    <span className="text-[13px] font-bold">Net Salary Payable</span>
                    <span className="text-[20px] font-bold">{fmt(run.netSalary)}</span>
                </div>
                <p className="words text-[11px] text-gray-500 italic mb-3">
                    Amount in words: <strong>{toWords(run.netSalary)}</strong>
                </p>

                {/* Status & Approval */}
                <div className="flex justify-between text-[11px] text-gray-500 mb-4">
                    <span>
                        Status: <span className="font-semibold capitalize text-gray-700">{run.status}</span>
                    </span>
                    {run.approvedBy && (
                        <span>
                            Approved by: <span className="font-semibold text-gray-700">
                                {run.approvedBy.firstName} {run.approvedBy.lastName}
                            </span>
                            {run.approvedAt && ` on ${new Date(run.approvedAt).toLocaleDateString("en-IN")}`}
                        </span>
                    )}
                    {run.paidAt && (
                        <span>Paid on: <span className="font-semibold text-gray-700">{new Date(run.paidAt).toLocaleDateString("en-IN")}</span></span>
                    )}
                </div>

                {/* Signature Block */}
                <div className="footer flex justify-between mt-8 pt-3 border-t border-gray-200">
                    <div className="sig-block text-center">
                        <div className="sig-line border-t border-gray-700 w-40 mx-auto mt-7 mb-1" />
                        <p className="text-[11px] text-gray-500">Employee Signature</p>
                    </div>
                    <div className="sig-block text-center">
                        <div className="sig-line border-t border-gray-700 w-40 mx-auto mt-7 mb-1" />
                        <p className="text-[11px] text-gray-500">Authorised Signatory</p>
                        <p className="text-[10px] text-gray-400">{company?.name || ""}</p>
                    </div>
                </div>

                {/* Footer Notice */}
                <p className="notice text-[10px] text-gray-400 text-center mt-3 pt-2 border-t border-gray-100">
                    This is a computer-generated payslip and does not require a physical signature. | {company?.name}
                </p>
            </div>
        </div>
    );
};

export default PayslipPrint;
