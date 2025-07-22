import React, { useEffect, useState } from 'react';
import { Layout, DatePicker, Table, Typography, Row, Col, Card, Spin, message } from 'antd';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import 'antd/dist/reset.css';
import './App.css';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Header, Content } = Layout;

const API_BASE = 'http://localhost:8000';

function formatDate(date) {
  return date.format('YYYY-MM-DD');
}

function App() {
  const [dateRange, setDateRange] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categorySummary, setCategorySummary] = useState([]);
  const [severitySummary, setSeveritySummary] = useState([]);
  const [typeSummary, setTypeSummary] = useState([]);
  const [focusAreas, setFocusAreas] = useState({ top_categories: [], top_subjects: [], total_tickets: 0 });

  const fetchData = async (from, to) => {
    setLoading(true);
    try {
      const [catRes, sevRes, typeRes, focusRes] = await Promise.all([
        axios.get(`${API_BASE}/summary/category`, { params: { from_date: from, to_date: to } }),
        axios.get(`${API_BASE}/summary/severity`, { params: { from_date: from, to_date: to } }),
        axios.get(`${API_BASE}/summary/type`, { params: { from_date: from, to_date: to } }),
        axios.get(`${API_BASE}/focus-areas`, { params: { from_date: from, to_date: to } }),
      ]);
      setCategorySummary(Object.entries(catRes.data).map(([k, v]) => ({ category: k, count: v })));
      setSeveritySummary(Object.entries(sevRes.data).map(([k, v]) => ({ severity: k, count: v })));
      setTypeSummary(Object.entries(typeRes.data).map(([k, v]) => ({ type: k, count: v })));
      setFocusAreas(focusRes.data);
    } catch (err) {
      message.error('Failed to fetch data from backend.');
    }
    setLoading(false);
  };

  useEffect(() => {
    // Default: last 30 days
    const end = window.dayjs ? window.dayjs() : require('dayjs')();
    const start = end.subtract(30, 'day');
    setDateRange([start, end]);
    fetchData(formatDate(start), formatDate(end));
    // eslint-disable-next-line
  }, []);

  const onDateChange = (dates) => {
    setDateRange(dates);
    if (dates && dates.length === 2) {
      fetchData(formatDate(dates[0]), formatDate(dates[1]));
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: 0 }}>
        <Title level={2} style={{ margin: '16px' }}>Support Dashboard</Title>
      </Header>
      <Content style={{ margin: '24px' }}>
        <Card style={{ marginBottom: 24 }}>
          <Row align="middle" gutter={16}>
            <Col>
              <b>Date Range:</b>
            </Col>
            <Col>
              <RangePicker value={dateRange} onChange={onDateChange} allowClear={false} />
            </Col>
            <Col>
              <b>Total Tickets:</b> {focusAreas.total_tickets}
            </Col>
          </Row>
        </Card>
        {loading ? <Spin size="large" /> : (
          <Row gutter={[24, 24]}>
            <Col xs={24} md={8}>
              <Card title="Category Summary">
                <Table
                  dataSource={categorySummary}
                  columns={[{ title: 'Category', dataIndex: 'category' }, { title: 'Count', dataIndex: 'count' }]}
                  size="small"
                  pagination={false}
                  rowKey="category"
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card title="Severity Summary">
                <Table
                  dataSource={severitySummary}
                  columns={[{ title: 'Severity', dataIndex: 'severity' }, { title: 'Count', dataIndex: 'count' }]}
                  size="small"
                  pagination={false}
                  rowKey="severity"
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card title="Type Summary">
                <Table
                  dataSource={typeSummary}
                  columns={[{ title: 'Type', dataIndex: 'type' }, { title: 'Count', dataIndex: 'count' }]}
                  size="small"
                  pagination={false}
                  rowKey="type"
                />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title="Top Categories (Key Focus Area)">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={focusAreas.top_categories?.map(([name, value]) => ({ name, value })) || []}>
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#1890ff" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title="Top Subjects (Key Focus Area)">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={focusAreas.top_subjects?.map(([name, value]) => ({ name, value })) || []}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#82ca9d"
                      label
                    >
                      {(focusAreas.top_subjects || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#82ca9d', '#8884d8', '#ffc658', '#ff8042', '#8dd1e1'][index % 5]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}

export default App;
