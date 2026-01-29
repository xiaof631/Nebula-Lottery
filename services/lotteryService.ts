import { Employee, BarrageMessage, Prize } from '../types';
import { API_BASE_URL } from '../constants';
import { generateMockEmployees, getRandomWinner } from './mockData';

export const fetchParticipants = async (): Promise<Employee[]> => {
  try {
    if (API_BASE_URL.includes('your-subdomain')) throw new Error("API not configured");
    const response = await fetch(`${API_BASE_URL}/api/get-participants`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('API unavailable, switching to Mock Data');
    return generateMockEmployees(200);
  }
};

export const fetchPrizes = async (): Promise<Prize[]> => {
  try {
    if (API_BASE_URL.includes('your-subdomain')) throw new Error("API not configured");
    const response = await fetch(`${API_BASE_URL}/api/get-prizes`);
    if (!response.ok) throw new Error("Failed to fetch prizes");
    return await response.json();
  } catch (error) {
    return [
      { id: 1, name: '三等奖', description: '京东卡', total_count: 5, drawn_count: 0, priority: 1 },
      { id: 2, name: '二等奖', description: 'Switch', total_count: 3, drawn_count: 0, priority: 2 },
      { id: 3, name: '一等奖', description: 'MacBook', total_count: 1, drawn_count: 0, priority: 3 },
    ];
  }
};

export const updatePrize = async (id: number, count: number): Promise<void> => {
  try {
    if (API_BASE_URL.includes('your-subdomain')) {
        console.warn("API not configured, update local only");
        return;
    }
    const response = await fetch(`${API_BASE_URL}/api/update-prize`, {
        method: 'POST',
        body: JSON.stringify({ id, count }),
        headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error("Failed to update prize");
  } catch (error) {
      console.error(error);
      throw error;
  }
}

export const drawWinner = async (prizeId?: number): Promise<Employee | null> => {
  try {
    if (API_BASE_URL.includes('your-subdomain')) throw new Error("API not configured");
    const response = await fetch(`${API_BASE_URL}/api/draw`, {
      method: 'POST',
      body: JSON.stringify({ prizeId }),
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('API unavailable, switching to Mock Data');
    await new Promise(resolve => setTimeout(resolve, 600));
    return getRandomWinner();
  }
};

export const fetchMessages = async (): Promise<BarrageMessage[]> => {
  try {
    if (API_BASE_URL.includes('your-subdomain')) throw new Error("API not configured");
    const response = await fetch(`${API_BASE_URL}/api/get-messages`);
    if (!response.ok) throw new Error("Failed to fetch messages");
    return await response.json();
  } catch (error) {
    const now = Date.now();
    return [
        { id: 1, user_id: '101', name: '王大力', content: '祝公司业绩长虹！🚀', created_at: now },
        { id: 2, user_id: '102', name: 'Alice', content: '新的一年，大吉大利！🧧', created_at: now },
    ];
  }
};