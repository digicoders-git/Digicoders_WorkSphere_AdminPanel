import { CreditCard } from "lucide-react";

export default function PaymentAccounts() {
    return (
        <div className="p-6 bg-gray-50 min-h-screen flex flex-col items-center justify-center text-center">
            <CreditCard size={48} className="text-gray-200 mb-3" />
            <p className="text-lg font-semibold text-gray-500">Payment Accounts</p>
            <p className="text-sm text-gray-400 mt-1">
                Payment details are now configured per proposal template.
            </p>
        </div>
    );
}
