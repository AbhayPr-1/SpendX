const CATEGORIES = [
  'Food & Dining',
  'Transport & Auto',
  'Utilities & Bills',
  'Shopping',
  'Entertainment',
  'Healthcare & Fitness',
  'Education',
  'Travel',
  'Miscellaneous',
];

const KEYWORD_RULES = {
  'Food & Dining': [
    'mcdonald', 'burger', 'starbucks', 'pizza', 'subway', 'restaurant',
    'swiggy', 'zomato', 'cafe', 'food', 'dining', 'coffee', 'lunch',
    'dinner', 'breakfast', 'eat', 'bakery', 'kfc', 'domino', 'grill',
    'bistro', 'foodland', 'grocery', 'groceries', 'supermarket', 'sweets',
  ],
  'Transport & Auto': [
    'uber', 'lyft', 'taxi', 'cab', 'metro', 'train', 'bus', 'fuel',
    'petrol', 'diesel', 'gas station', 'toll', 'parking', 'ola', 'auto',
    'rickshaw', 'railway', 'irctc',
  ],
  'Utilities & Bills': [
    'electricity', 'water', 'gas bill', 'internet', 'wifi', 'broadband',
    'mobile', 'recharge', 'phone bill', 'rent', 'insurance', 'power',
    'telecom', 'sewer', 'trash', 'landlord',
  ],
  'Shopping': [
    'amazon', 'flipkart', 'walmart', 'target', 'clothing', 'shoes', 'mall',
    'zara', 'h&m', 'myntra', 'store', 'buy', 'shampoo', 'soap', 'ikea',
    'decathlon', 'costco', 'boutique', 'fashion',
  ],
  'Entertainment': [
    'movie', 'cinema', 'theater', 'bookmyshow', 'concert', 'game', 'steam',
    'playstation', 'xbox', 'pub', 'bar', 'club', 'netflix', 'spotify',
    'prime video', 'disney', 'music', 'arcade', 'bowling',
  ],
  'Healthcare & Fitness': [
    'doctor', 'hospital', 'medicine', 'pharmacy', 'chemist', 'gym',
    'fitness', 'yoga', 'clinic', 'dentist', 'health', 'medical', 'therapy',
    'workout',
  ],
  'Education': [
    'tuition', 'course', 'udemy', 'coursera', 'school', 'college', 'fees',
    'book', 'stationery', 'exam', 'class', 'workshop', 'tutorial', 'seminar',
  ],
  'Travel': [
    'hotel', 'airbnb', 'booking.com', 'flight', 'trip', 'vacation',
    'holiday', 'makemytrip', 'expedia', 'hostel', 'resort', 'cruise',
    'luggage',
  ],
};

let tfInstance = null;
let modelPromise = null;

function normalizeText(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function getFallbackCategory(description) {
  const text = normalizeText(description);
  if (!text) return { category: 'Miscellaneous', confidence: 0.2 };

  let bestCategory = 'Miscellaneous';
  let bestScore = 0;

  for (const category of CATEGORIES) {
    const keywords = KEYWORD_RULES[category] || [];
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) score += 3;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  if (bestScore === 0) {
    return { category: 'Miscellaneous', confidence: 0.2 };
  }

  return { category: bestCategory, confidence: Math.min(0.99, 0.35 + bestScore * 0.14) };
}

async function loadTensorFlow() {
  if (tfInstance) return tfInstance;

  try {
    const tfNode = await import('@tensorflow/tfjs-node');
    tfInstance = tfNode.default || tfNode;
    return tfInstance;
  } catch (_error) {
    try {
      const tfBrowser = await import('@tensorflow/tfjs');
      tfInstance = tfBrowser.default || tfBrowser;
      return tfInstance;
    } catch (error) {
      tfInstance = null;
      return null;
    }
  }
}

function buildFeatureVector(description) {
  const text = normalizeText(description);
  const vector = new Array(CATEGORIES.length).fill(0);

  CATEGORIES.forEach((category, index) => {
    const keywords = KEYWORD_RULES[category] || [];
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        vector[index] += 1;
      }
    }
  });

  return vector;
}

async function ensureTensorflowModel() {
  if (modelPromise) return modelPromise;

  modelPromise = (async () => {
    const tf = await loadTensorFlow();
    if (!tf) return null;

    try {
      const model = tf.sequential();
      model.add(tf.layers.dense({
        inputShape: [CATEGORIES.length],
        units: CATEGORIES.length,
        useBias: false,
        activation: 'softmax',
      }));

      const identity = [];
      for (let i = 0; i < CATEGORIES.length; i++) {
        const row = new Array(CATEGORIES.length).fill(0);
        row[i] = 1;
        identity.push(row);
      }

      model.setWeights([
        tf.tensor2d(identity, [CATEGORIES.length, CATEGORIES.length]),
      ]);

      return model;
    } catch (_error) {
      return null;
    }
  })();

  return modelPromise;
}

export async function predictExpenseCategoryTensorFlow(description) {
  const fallback = getFallbackCategory(description);

  try {
    const tf = await loadTensorFlow();
    if (!tf) {
      return fallback;
    }

    const model = await ensureTensorflowModel();
    if (!model) {
      return fallback;
    }

    const values = buildFeatureVector(description);
    const input = tf.tensor2d([values], [1, CATEGORIES.length]);
    const prediction = model.predict(input);
    const scores = Array.from(await prediction.data());
    input.dispose();
    prediction.dispose();

    const bestIndex = scores.indexOf(Math.max(...scores));
    const category = CATEGORIES[bestIndex] || 'Miscellaneous';
    const confidence = Number(Math.max(...scores).toFixed(4));

    if (category === 'Miscellaneous' && bestIndex === -1) {
      return fallback;
    }

    return {
      category,
      confidence: Number.isFinite(confidence) ? confidence : fallback.confidence,
    };
  } catch (_error) {
    return fallback;
  }
}

export { CATEGORIES };
