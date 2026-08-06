import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import { getInboxSocket, joinRoom, leaveRoom } from "../services/socket";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// Centralizes template + category fetching, live status sync, and the
// mutations every template list page needs — Templates, Approved Templates,
// and the Approvals queue all read/write through this one hook instead of
// each keeping its own copy of the same fetch/socket logic.
export function useTemplates() {
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await api.get(`${API_BASE_URL}/api/templates`);
      setTemplates(res.data.templates || []);
    } catch (error) {
      console.log(error);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get(`${API_BASE_URL}/api/template-categories`);
      setCategories(res.data.categories || []);
    } catch (error) {
      console.log(error);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await Promise.all([fetchTemplates(), fetchCategories()]);
      setLoading(false);
    })();
  }, [fetchTemplates, fetchCategories]);

  useEffect(() => {
    joinRoom("templates");
    const socket = getInboxSocket();
    const handleTemplateStatusUpdate = (updatedTemplate) => {
      setTemplates((prev) =>
        prev.map((item) => (item._id === updatedTemplate._id ? updatedTemplate : item)),
      );
    };
    socket.on("template_status_updated", handleTemplateStatusUpdate);
    return () => {
      socket.off("template_status_updated", handleTemplateStatusUpdate);
      leaveRoom("templates");
    };
  }, []);

  const updateTemplateStatus = useCallback(async (templateId, newStatus) => {
    await api.patch(`${API_BASE_URL}/api/templates/${templateId}/status`, {
      status: newStatus,
    });
    setTemplates((prev) =>
      prev.map((item) => (item._id === templateId ? { ...item, status: newStatus } : item)),
    );
  }, []);

  const deleteTemplate = useCallback(async (templateId) => {
    await api.delete(`${API_BASE_URL}/api/templates/${templateId}`);
    setTemplates((prev) => prev.filter((item) => item._id !== templateId));
  }, []);

  return {
    templates,
    categories,
    loading,
    refetch: fetchTemplates,
    updateTemplateStatus,
    deleteTemplate,
  };
}
