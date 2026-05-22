const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Article = require('./models/Article');
const EPaper = require('./models/EPaper');

dotenv.config();

const isAdminOnly = process.argv.includes('--admin-only');

const seedAdminOnly = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for seeding...');

    // Check if admin already exists
    const existing = await User.findOne({ email: 'cyash7420@gmail.com' });
    if (existing) {
      console.log('Admin user already exists. Skipping creation.');
    } else {
      await User.create({
        name: 'Admin',
        email: 'cyash7420@gmail.com',
        password: 'yash123',
        role: 'admin',
        isSubscribed: true,
      });
      console.log('Admin user created successfully!');
    }

    console.log('\n--- Admin Credentials ---');
    console.log('Admin: cyash7420@gmail.com / yash123');
    console.log('-------------------------\n');

    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Article.deleteMany({});
    await EPaper.deleteMany({});

    // Create admin user
    const admin = await User.create({
      name: 'Admin',
      email: 'cyash7420@gmail.com',
      password: 'yash123',
      role: 'admin',
      isSubscribed: true,
    });

    // Create a subscriber user
    const subscriber = await User.create({
      name: 'Subscriber User',
      email: 'subscriber@example.com',
      password: 'user123',
      role: 'user',
      isSubscribed: true,
    });

    // Create a regular user
    const regularUser = await User.create({
      name: 'Regular User',
      email: 'user@example.com',
      password: 'user123',
      role: 'user',
      isSubscribed: false,
    });

    console.log('Users seeded');

    // Create sample articles
    const articleSeeds = [
      {
        title: 'Breaking: Major Infrastructure Project Announced for Urban Development',
        content: `<p>In a landmark announcement today, city officials unveiled an ambitious infrastructure project aimed at transforming the urban landscape. The project, estimated at $2.5 billion, will include new transportation networks, green spaces, and modernized public facilities.</p>
<p>The initiative encompasses a 15-mile light rail extension, three new community parks spanning over 200 acres, and the renovation of 12 public buildings. City planners have described this as the most significant urban development program in the past three decades.</p>
<p>"This project represents our commitment to building a sustainable, accessible, and vibrant city for future generations," said the Mayor during the press conference. "We've listened to our residents and this plan directly addresses their needs for better transportation, more green spaces, and modern facilities."</p>
<p>Construction is expected to begin in the fall, with the first phase of the light rail extension slated for completion within 18 months. Environmental impact assessments have been completed, and community feedback sessions will continue throughout the project's duration.</p>
<p>Economic analysts project the initiative will create approximately 15,000 jobs during the construction phase and an additional 5,000 permanent positions once all facilities are operational. Local businesses have expressed strong support for the project, citing anticipated increases in foot traffic and economic activity.</p>`,
        category: 'National',
        imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
        isPremium: false,
        publishedAt: new Date('2026-03-17'),
      },
      {
        title: 'Technology Giants Invest $10B in Renewable Energy Research',
        content: `<p>A consortium of leading technology companies announced a joint investment of $10 billion in renewable energy research and development. The initiative, dubbed "Green Future Alliance," aims to accelerate the transition to sustainable energy sources.</p>
<p>The investment will fund research into next-generation solar panels, advanced battery storage systems, and innovative wind energy technologies. The consortium expects these investments to yield breakthroughs that could reduce renewable energy costs by up to 40% within the next five years.</p>
<p>Dr. Sarah Chen, chief research officer at one of the participating companies, highlighted the potential impact: "We're at a tipping point in energy technology. This collaborative investment will allow us to tackle challenges that no single company could address alone."</p>
<p>The alliance will establish three new research facilities across the country, employing over 2,000 scientists and engineers. Multiple universities have been invited to participate as research partners, ensuring that cutting-edge academic insights inform commercial development.</p>
<p>Industry observers have praised the initiative, noting that it represents the largest private-sector investment in renewable energy research to date. Environmental organizations have welcomed the announcement while emphasizing the need for continued government support and policy frameworks.</p>
<p>The first round of research grants will be distributed by the end of this quarter, with initial results expected within 12 to 18 months. The consortium has committed to making key findings publicly available to accelerate industry-wide adoption of new technologies.</p>`,
        category: 'Technology',
        imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
        isPremium: true,
        publishedAt: new Date('2026-03-16'),
      },
      {
        title: 'Global Sports Championship Draws Record Viewership Numbers',
        content: `<p>The International Sports Championship concluded this weekend with record-breaking viewership figures that exceeded all expectations. Over 4.2 billion viewers tuned in across various platforms, making it the most-watched sporting event in history.</p>
<p>The championship featured 156 competing nations and over 11,000 athletes across 42 sporting disciplines. Host cities reported unprecedented visitor numbers, with tourism revenue estimated at $8.7 billion.</p>
<p>Streaming platforms saw a 340% increase in viewership compared to the previous championship, reflecting the growing shift toward digital consumption of sports content. Social media engagement broke records as well, with over 12 billion interactions across major platforms during the event.</p>
<p>The closing ceremony, watched by an estimated 2.1 billion people globally, featured spectacular performances and a touching tribute to athletes who overcame personal challenges to compete at the highest level.</p>`,
        category: 'Sports',
        imageUrl: 'https://images.unsplash.com/photo-1461896836934-bd45ba3e5832?w=800',
        isPremium: false,
        publishedAt: new Date('2026-03-15'),
      },
      {
        title: 'Healthcare Innovation: AI-Powered Diagnostics Show Promising Results',
        content: `<p>A groundbreaking study published in the International Medical Journal reveals that AI-powered diagnostic tools are achieving accuracy rates of 97.3% in detecting early-stage diseases, significantly outperforming traditional methods.</p>
<p>The research, conducted across 45 hospitals in 12 countries over three years, evaluated the effectiveness of machine learning algorithms in analyzing medical imaging, pathology results, and patient histories. The AI systems demonstrated particular strength in identifying early-stage cancers, cardiovascular conditions, and neurological disorders.</p>
<p>"These results represent a paradigm shift in medical diagnostics," said Dr. James Morrison, lead researcher at the Institute for Medical Innovation. "AI doesn't replace doctors—it gives them superpowers. It can see patterns in data that would take a human specialist hours to identify."</p>
<p>Healthcare providers across the globe are now fast-tracking the integration of AI diagnostic tools into their clinical workflows. Regulatory agencies in several countries have expedited approval processes for AI-based medical devices, acknowledging the potential for improved patient outcomes.</p>
<p>Despite the positive results, researchers emphasized the importance of maintaining human oversight in the diagnostic process. The AI tools are designed to assist, not replace, medical professionals in making treatment decisions.</p>
<p>The study also highlighted significant cost savings, with AI-assisted diagnostics reducing unnecessary procedures by 35% and shortening the average time to diagnosis by 60%. These efficiencies could save healthcare systems billions of dollars annually while improving patient experiences.</p>`,
        category: 'Health',
        imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800',
        isPremium: true,
        publishedAt: new Date('2026-03-14'),
      },
      {
        title: 'Stock Markets Rally as Economic Indicators Show Strong Recovery',
        content: `<p>Global stock markets experienced their strongest weekly rally in over two years as a series of positive economic indicators signaled robust recovery across major economies. The benchmark index closed up 4.2% for the week, while technology and healthcare sectors led the gains.</p>
<p>Key economic data released this week showed unemployment rates falling to pre-pandemic levels in several countries, manufacturing output expanding for the eighth consecutive month, and consumer confidence reaching its highest point in five years.</p>
<p>"The convergence of these positive indicators paints a compelling picture of economic resilience," said Maria Santos, chief economist at Global Financial Advisory. "We're seeing broad-based recovery that extends beyond just a few sectors."</p>
<p>Central banks in major economies have signaled a cautious approach to monetary policy adjustments, providing additional reassurance to investors. Bond markets also reflected optimism, with yields stabilizing at levels that suggest sustained growth without inflationary pressures.</p>`,
        category: 'Business',
        imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
        isPremium: false,
        publishedAt: new Date('2026-03-13'),
      },
      {
        title: 'Education Reform: New Digital Learning Framework Adopted Nationwide',
        content: `<p>The Ministry of Education has officially adopted a comprehensive digital learning framework that will transform how students engage with educational content across the country. The framework, developed over two years with input from educators, parents, and technology experts, emphasizes personalized learning experiences.</p>
<p>Under the new framework, every student from grades 3 through 12 will have access to AI-powered learning platforms that adapt to their individual pace and learning style. The government has allocated $3.2 billion to implement the program, including providing devices to students from economically disadvantaged backgrounds.</p>
<p>The initiative also includes extensive teacher training programs, with over 500,000 educators scheduled to complete digital pedagogy certification within the next 18 months. Universities have revamped their education programs to incorporate digital teaching methodologies.</p>
<p>Early pilot programs in 200 schools showed a 28% improvement in student engagement and a 15% increase in standardized test scores. Students reported higher satisfaction with their learning experiences, particularly in STEM subjects.</p>`,
        category: 'Education',
        imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800',
        isPremium: true,
        publishedAt: new Date('2026-03-12'),
      },
      {
        title: 'Climate Summit Produces Historic Agreement on Carbon Emissions',
        content: `<p>World leaders gathered at the Global Climate Summit reached a historic agreement that commits 195 nations to reduce carbon emissions by 55% by 2035. The summit, hailed as the most productive climate conference in a decade, produced binding commitments backed by financial mechanisms and accountability frameworks.</p>
<p>Key provisions of the agreement include the establishment of a $500 billion green transition fund to support developing nations, standardized carbon pricing mechanisms, and mandatory annual emissions reporting by all member states.</p>
<p>"Today marks a turning point in our collective response to the climate crisis," said the UN Secretary-General. "For the first time, we have not just aspirations, but concrete financial commitments and enforcement mechanisms."</p>
<p>The agreement also addresses deforestation, ocean conservation, and sustainable agriculture, taking a holistic approach to environmental protection. Private sector commitments worth an additional $200 billion were announced alongside the government accord.</p>`,
        category: 'World',
        imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800',
        isPremium: false,
        publishedAt: new Date('2026-03-11'),
      },
      {
        title: 'Cultural Festival Celebrates Heritage with Modern Artistic Expression',
        content: `<p>The annual International Cultural Festival opened its doors this weekend, attracting over 500,000 visitors to a celebration that blends traditional heritage with contemporary artistic expression. The ten-day event features performances, exhibitions, and interactive experiences from over 80 countries.</p>
<p>This year's festival theme, "Roots and Wings," explores how cultural traditions evolve and adapt in the modern world. Highlights include a stunning fusion music concert series, immersive digital art installations that reimagine traditional folk tales, and culinary experiences that bridge ancient recipes with modern gastronomy.</p>
<p>"Culture isn't static—it lives, breathes, and evolves," said the festival's artistic director. "Our goal is to show that honoring our heritage doesn't mean living in the past. It means carrying the best of our traditions forward into a new era of creative expression."</p>
<p>The festival has also launched a digital platform that allows global audiences to participate virtually, with live-streamed performances and interactive workshops available in 25 languages.</p>`,
        category: 'Entertainment',
        imageUrl: 'https://images.unsplash.com/photo-1492684223f8-e1f7e12a2196?w=800',
        isPremium: false,
        publishedAt: new Date('2026-03-10'),
      },
    ];

    const articles = await Article.create(
      articleSeeds.map((article) => ({ ...article, status: 'published' }))
    );

    console.log(`${articles.length} articles seeded`);

    // Create sample e-papers
    const epapers = await EPaper.create([
      {
        title: 'News Portal - Morning Edition',
        publishDate: new Date('2026-03-17'),
        pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      },
      {
        title: 'News Portal - Morning Edition',
        publishDate: new Date('2026-03-16'),
        pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      },
      {
        title: 'News Portal - Morning Edition',
        publishDate: new Date('2026-03-15'),
        pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      },
      {
        title: 'News Portal - Weekend Special',
        publishDate: new Date('2026-03-14'),
        pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      },
      {
        title: 'News Portal - Morning Edition',
        publishDate: new Date('2026-03-13'),
        pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      },
      {
        title: 'News Portal - Morning Edition',
        publishDate: new Date('2026-03-12'),
        pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      },
    ]);

    console.log(`${epapers.length} e-papers seeded`);
    console.log('\n--- Seed Credentials ---');
    console.log('Admin: cyash7420@gmail.com / yash123');
    console.log('Subscriber: subscriber@example.com / user123');
    console.log('Regular User: user@example.com / user123');
    console.log('------------------------\n');

    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

if (isAdminOnly) {
  seedAdminOnly();
} else {
  seedDB();
}
