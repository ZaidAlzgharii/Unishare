import streamlit as st
import google.generativeai as genai
import os
import tempfile

# ==========================================
# 1. Configuration & Design System (Slate/Blue Theme)
# ==========================================
st.set_page_config(
    page_title="UniShare | AI Summary",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS to match Tailwind Slate/Blue palette from your React App
st.markdown("""
<style>
    /* Global Background (Slate-50) */
    .stApp {
        background-color: #f8fafc;
        color: #0f172a;
    }
    
    /* Sidebar Background (Slate-900) */
    [data-testid="stSidebar"] {
        background-color: #0f172a;
    }
    [data-testid="stSidebar"] * {
        color: #e2e8f0 !important;
    }

    /* Primary Buttons (Blue-600) */
    .stButton>button {
        background-color: #2563eb;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 0.6rem 1.2rem;
        font-weight: 600;
        transition: all 0.2s;
    }
    .stButton>button:hover {
        background-color: #1d4ed8;
        transform: translateY(-1px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    /* Cards / Containers (White + Shadow) */
    div.block-container {
        padding-top: 2rem;
    }
    
    /* Typography */
    h1, h2, h3 {
        font-family: 'Inter', system-ui, sans-serif;
        color: #0f172a;
    }
    
    /* Success Message */
    .stSuccess {
        background-color: #dcfce7;
        color: #166534;
        border-left-color: #22c55e;
    }
</style>
""", unsafe_allow_html=True)

# ==========================================
# 2. Constants & Data (Synced with constants.ts)
# ==========================================
MAJORS = [
    'Molecular Genetics Biology',
    'Computer Science',
    'Social Thought, Economy, and Policy (STEP)',
    'Global Studies and Diplomacy',
    'Human Rights and International Law',
    'Literature and Society',
    'Digital Media and Communication',
    'Urban Studies'
]

MAJORS_AR = [
    'الأحياء والوراثة الجزيئية',
    'علوم الحاسوب',
    'الفكر الاجتماعي والاقتصاد والسياسة (STEP)',
    'الدراسات العالمية والدبلوماسية',
    'حقوق الإنسان والقانون الدولي',
    'الأدب والمجتمع',
    'الإعلام الرقمي والاتصال',
    'الدراسات الحضرية'
]

CATEGORIES = ['Summary', 'Lecture Notes', 'Past Exam', 'Assignment', 'Cheatsheet']
CATEGORIES_AR = ['ملخص', 'ملاحظات محاضرة', 'امتحان سابق', 'واجب/تكليف', 'ورقة مراجعة']

# Translation Dictionary (Matches constants.ts keys)
UI_TEXT = {
    'English': {
        'title': 'AI Generated Key Takeaways',
        'subtitle': 'Upload your document to generate a structured summary.',
        'major_label': 'Filter by Major',
        'category_label': 'Category',
        'upload_label': 'Upload Note',
        'generate_btn': '✨ AI Summary',
        'processing': 'Analyzing content...',
        'success': 'Summary generated successfully!',
        'error_api': 'API Key is missing. Please check Secrets.',
        'out_overview': 'Overview & Core Concepts',
        'out_insights': 'Key Insights & Takeaways',
        'out_terms': 'Terminology'
    },
    'Arabic': {
        'title': 'أهم النقاط المستخرجة بالذكاء الاصطناعي',
        'subtitle': 'ارفع ملفك لتوليد ملخص منظم ودقيق.',
        'major_label': 'تصفية حسب التخصص',
        'category_label': 'الفئة',
        'upload_label': 'رفع ملاحظة',
        'generate_btn': '✨ ملخص الذكاء الاصطناعي',
        'processing': 'جاري تحليل المحتوى...',
        'success': 'تم توليد الملخص بنجاح!',
        'error_api': 'مفتاح API مفقود. يرجى التحقق من الإعدادات.',
        'out_overview': 'نظرة عامة والمفاهيم الأساسية',
        'out_insights': 'الرؤى الجوهرية وأهم النقاط',
        'out_terms': 'المصطلحات العلمية'
    }
}

# ==========================================
# 3. Sidebar & Context
# ==========================================
if 'language' not in st.session_state:
    st.session_state.language = 'English'

with st.sidebar:
    st.image("https://cdn-icons-png.flaticon.com/512/2997/2997316.png", width=50) # Placeholder Icon
    st.markdown("### UniShare AI")
    
    # Language Toggle
    lang = st.radio("Language / اللغة", ["English", "Arabic"], label_visibility="collapsed")
    st.session_state.language = lang
    
    t = UI_TEXT[lang]
    
    st.markdown("---")
    
    # Context Inputs
    if lang == 'English':
        selected_major = st.selectbox(t['major_label'], MAJORS)
        selected_category = st.selectbox(t['category_label'], CATEGORIES)
    else:
        selected_major = st.selectbox(t['major_label'], MAJORS_AR)
        selected_category = st.selectbox(t['category_label'], CATEGORIES_AR)
        
    st.markdown("---")
    st.caption("Powered by Gemini 1.5 Flash")

# ==========================================
# 4. Main Application Logic
# ==========================================

# Configure API
if "GOOGLE_API_KEY" in st.secrets:
    genai.configure(api_key=st.secrets["GOOGLE_API_KEY"])
else:
    st.error(t['error_api'])
    st.stop()

# Header
st.title(t['title'])
st.markdown(f"<p style='color:#64748b; font-size:1.1rem;'>{t['subtitle']}</p>", unsafe_allow_html=True)
st.markdown("---")

# File Uploader
uploaded_file = st.file_uploader(
    t['upload_label'], 
    type=['pdf', 'png', 'jpg', 'jpeg', 'mp4', 'mp3', 'wav']
)

if uploaded_file and st.button(t['generate_btn'], use_container_width=True):
    with st.spinner(t['processing']):
        try:
            # 1. Create Temp File
            suffix = f".{uploaded_file.name.split('.')[-1]}"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(uploaded_file.getvalue())
                tmp_path = tmp.name

            # 2. Determine Mime Type
            mime_type = uploaded_file.type
            if not mime_type:
                if suffix.lower() == '.pdf': mime_type = 'application/pdf'
                elif suffix.lower() == '.mp4': mime_type = 'video/mp4'
                elif suffix.lower() in ['.jpg', '.png', '.jpeg']: mime_type = 'image/jpeg'

            # 3. Upload to Gemini
            myfile = genai.upload_file(tmp_path, mime_type=mime_type)
            
            # Wait for processing (crucial for video/audio)
            import time
            while myfile.state.name == "PROCESSING":
                time.sleep(2)
                myfile = genai.get_file(myfile.name)

            # 4. Generate Content
            model = genai.GenerativeModel("gemini-1.5-flash")
            
            # System Prompt Engineering
            target_lang = "Arabic" if lang == "Arabic" else "English"
            
            system_prompt = f"""
            Role: You are an expert academic tutor for the UniShare platform.
            Context: The student is majoring in '{selected_major}' and this file is a '{selected_category}'.
            Task: Analyze the file and generate a comprehensive summary in **{target_lang}**.
            
            Strict Output Format:
            
            ### 1. {t['out_overview']}
            - Provide a clear, high-level summary of the material.
            - Identify the central thesis or main topic.

            ### 2. {t['out_insights']}
            - List 5-7 critical bullet points.
            - Focus on facts, dates, theories, or exam-relevant details.
            
            ### 3. {t['out_terms']}
            - Extract key definitions or technical terms found in the text.
            - Format as: **Term**: Definition.
            
            Style: Professional, academic, and concise.
            """

            response = model.generate_content([myfile, system_prompt])
            
            # 5. Display Result
            st.success(t['success'])
            
            # Custom Result Container
            st.markdown(f"""
            <div style="background-color:white; padding:2rem; border-radius:12px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); border:1px solid #e2e8f0;">
                {response.text}
            </div>
            """, unsafe_allow_html=True)

            # Cleanup
            os.unlink(tmp_path)

        except Exception as e:
            st.error(f"An error occurred: {str(e)}")
