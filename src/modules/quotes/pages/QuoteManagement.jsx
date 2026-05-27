import { useState, useEffect } from "react";
import { FileText, Download, Trash2, Eye, X } from "lucide-react";
import { toast } from "react-toastify";
import { getTemplates, deleteTemplate } from "../../leads/services/proposalService";
import ProposalTemplateManager from "../../leads/pages/ProposalTemplateManager";

export default function QuoteManagement() {
    return <ProposalTemplateManager />;
}
