const state = {
  data: [],
  overview: null,
  analytics: null,
  filters: {
    region: 'all',
    market: 'all',
    duration: 30,
  },
};

const elements = {
  kpiGrid: document.getElementById('kpiGrid'),
  channelTable: document.getElementById('channelTable'),
  coverageChart: document.getElementById('coverageChart'),
  contactList: document.getElementById('contactList'),
  contentList: document.getElementById('contentList'),
  durationBarChart: document.getElementById('durationBarChart'),
  demographicChart: document.getElementById('demographicChart'),
  liveStatus: document.getElementById('liveStatus'),
  refreshButton: document.getElementById('refreshButton'),
  regionFilter: document.getElementById('regionFilter'),
  marketFilter: document.getElementById('marketFilter'),
  durationFilter: document.getElementById('durationFilter'),
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCompact = (value) => {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
};

const getDurationCost = (channel, durationSeconds) => {
  const multiplier = durationSeconds === 15 ? 0.55 : durationSeconds === 30 ? 1 : durationSeconds === 60 ? 1.7 : 2.35;
  return Number((channel.liveCost * multiplier).toFixed(2));
};

const getFilteredChannels = () => {
  return state.data.filter((channel) => {
    const regionMatch = state.filters.region === 'all' || channel.region === state.filters.region;
    const marketMatch = state.filters.market === 'all' || channel.market === state.filters.market;
    return regionMatch && marketMatch;
  });
};

const renderKPIs = () => {
  if (!state.overview) return;

  const cards = [
    {
      label: 'Avg local ad cost',
      value: formatCurrency(state.overview.averageLocalCost),
      meta: `${state.overview.localChannels} local channels`,
    },
    {
      label: 'Avg global ad cost',
      value: formatCurrency(state.overview.averageGlobalCost),
      meta: `${state.overview.globalChannels} global channels`,
    },
    {
      label: 'Best value',
      value: state.overview.bestValue ? state.overview.bestValue.name : 'N/A',
      meta: state.overview.bestValue ? `~${formatCurrency(state.overview.bestValue.costPerReach)}/reach` : 'No data',
    },
    {
      label: 'Highest reach',
      value: state.overview.highestCoverage ? state.overview.highestCoverage.name : 'N/A',
      meta: state.overview.highestCoverage ? `${state.overview.highestCoverage.coveragePercent}% coverage` : 'No data',
    },
  ];

  elements.kpiGrid.innerHTML = cards
    .map(
      (card) => `
        <article class="kpi-card">
          <div class="label">${card.label}</div>
          <div class="value">${card.value}</div>
          <div class="meta">${card.meta}</div>
        </article>
      `,
    )
    .join('');
};

const renderChannelTable = () => {
  const channels = getFilteredChannels();

  if (!channels.length) {
    elements.channelTable.innerHTML = '<p>No channels match your filters.</p>';
    return;
  }

  const rows = channels
    .map((channel) => {
      const durationCost = getDurationCost(channel, Number(state.filters.duration));
      const rowClass = durationCost > 350000 ? 'high' : durationCost > 220000 ? 'medium' : 'good';
      const regionClass = channel.region === 'Local' ? 'local' : 'global';

      return `
        <tr>
          <td><div class="channel-name">${channel.name}</div></td>
          <td><span class="badge ${regionClass}">${channel.region}</span></td>
          <td>${channel.market}</td>
          <td>${channel.coveragePercent}%</td>
          <td>${formatCurrency(channel.liveCost)}</td>
          <td>${formatCurrency(durationCost)}</td>
          <td><span class="badge ${rowClass}">${rowClass === 'good' ? 'Strong' : rowClass === 'medium' ? 'Balanced' : 'Premium'}</span></td>
        </tr>
      `;
    })
    .join('');

  elements.channelTable.innerHTML = `
    <table class="channel-table">
      <thead>
        <tr>
          <th>Channel</th>
          <th>Region</th>
          <th>Market</th>
          <th>Coverage</th>
          <th>Live cost</th>
          <th>${state.filters.duration}s cost</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

const renderCoverageChart = () => {
  const channels = getFilteredChannels();
  const maxCoverage = Math.max(...channels.map((channel) => channel.coveragePercent), 100);

  elements.coverageChart.innerHTML = channels
    .slice()
    .sort((a, b) => b.coveragePercent - a.coveragePercent)
    .map((channel) => {
      const width = (channel.coveragePercent / maxCoverage) * 100;
      return `
        <div class="coverage-item">
          <div class="coverage-top">
            <span>${channel.name}</span>
            <strong>${channel.coveragePercent}%</strong>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${width}%"></div>
          </div>
        </div>
      `;
    })
    .join('');
};

const renderContacts = () => {
  const channels = getFilteredChannels();

  const cardHtml = channels
    .slice(0, 4)
    .map(
      (channel) => `
        <div class="contact-item">
          <strong>${channel.name}</strong>
          <div><a href="${channel.officialWebsite}" target="_blank" rel="noreferrer">Website: ${channel.officialWebsite}</a></div>
          <div>Phone: ${channel.phone}</div>
          <div>Email: <a href="mailto:${channel.email}">${channel.email}</a></div>
          <div>Social: ${channel.social}</div>
        </div>
      `,
    )
    .join('');

  elements.contactList.innerHTML = cardHtml;
};

const renderContentList = () => {
  const channels = getFilteredChannels();
  const restrictions = [...new Set(channels.flatMap((channel) => channel.contentRestrictions))];

  elements.contentList.innerHTML = restrictions
    .slice(0, 7)
    .map((item) => `<li>${item}</li>`)
    .join('');
};

const renderDurationChart = () => {
  const channels = getFilteredChannels();
  const maxCost = Math.max(...channels.map((channel) => getDurationCost(channel, Number(state.filters.duration))), 1);

  const items = channels
    .slice()
    .sort((a, b) => getDurationCost(b, Number(state.filters.duration)) - getDurationCost(a, Number(state.filters.duration)))
    .map((channel) => {
      const cost = getDurationCost(channel, Number(state.filters.duration));
      const width = (cost / maxCost) * 100;
      return `
        <div class="duration-bar-item">
          <div class="label-row">
            <span>${channel.name}</span>
            <strong>${formatCurrency(cost)}</strong>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${width}%"></div>
          </div>
        </div>
      `;
    })
    .join('');

  elements.durationBarChart.innerHTML = items;
};

const renderDemographics = () => {
  if (!state.analytics) return;

  const rows = state.analytics.ageGroups
    .map(
      (group) => `
        <div class="age-row">
          <span class="name">${group.label}</span>
          <div class="bar-track"><div class="bar-fill" style="width: ${group.share}%;"></div></div>
          <span class="value">${group.share}%</span>
        </div>
      `,
    )
    .join('');

  const tips = state.analytics.watchingTips
    .map((tip) => `<div class="contact-item">${tip}</div>`)
    .join('');

  elements.demographicChart.innerHTML = `${rows}${tips}`;
};

const render = () => {
  renderKPIs();
  renderChannelTable();
  renderCoverageChart();
  renderContacts();
  renderContentList();
  renderDurationChart();
  renderDemographics();
};

const fetchDashboardData = async () => {
  try {
    const [overviewResponse, channelResponse, analyticsResponse] = await Promise.all([
      fetch('/api/overview'),
      fetch('/api/channels'),
      fetch('/api/analytics'),
    ]);

    const overviewResult = await overviewResponse.json();
    const channelResult = await channelResponse.json();
    const analyticsResult = await analyticsResponse.json();

    if (!overviewResult.success || !channelResult.success || !analyticsResult.success) {
      throw new Error('Data load failed');
    }

    state.overview = overviewResult.data;
    state.data = channelResult.data;
    state.analytics = analyticsResult.data;

    elements.liveStatus.textContent = `Live pricing • Updated ${new Date(state.overview.lastUpdated).toLocaleTimeString()}`;
    render();
  } catch (error) {
    console.error('Dashboard load failed:', error);
    elements.liveStatus.textContent = 'Data refresh failed';
  }
};

elements.regionFilter.addEventListener('change', (event) => {
  state.filters.region = event.target.value;
  render();
});

elements.marketFilter.addEventListener('change', (event) => {
  state.filters.market = event.target.value;
  render();
});

elements.durationFilter.addEventListener('change', (event) => {
  state.filters.duration = Number(event.target.value);
  render();
});

elements.refreshButton.addEventListener('click', fetchDashboardData);

fetchDashboardData();
setInterval(fetchDashboardData, 15000);
