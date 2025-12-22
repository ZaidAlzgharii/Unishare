import streamlit as st
import google.generativeai as genai
import os
import tempfile

# إعداد الصفحة
st.set_page_config(page_title="المُلخص الدراسي", page_icon="📚")

st.title("📚 أداة تلخيص الملفات الدراسية")
st.write("ارفع الملف (PDF, Audio, Video) وسأقوم بتلخيصه لك.")

# جلب المفتاح من إعدادات Streamlit السرية
# تأكد أنك وضعت المفتاح في Secrets كما شرحنا سابقاً
if "GOOGLE_API_KEY" in st.secrets:
    api_key = st.secrets["GOOGLE_API_KEY"]
    genai.configure(api_key=api_key)
else:
    st.error("مفتاح Google API غير موجود في إعدادات Secrets.")
    st.stop()

# واجهة الرفع
uploaded_file = st.file_uploader("اختر ملفاً", type=['mp4', 'mp3', 'pdf', 'wav', 'm4a'])

if uploaded_file and st.button("🚀 ابدأ التلخيص"):
    with st.spinner('جاري معالجة الملف... يرجى الانتظار...'):
        try:
            # إنشاء ملف مؤقت
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{uploaded_file.name.split('.')[-1]}") as tmp:
                tmp.write(uploaded_file.getvalue())
                tmp_path = tmp.name

            # تحديد نوع الملف
            mime_type = uploaded_file.type
            # تصحيح بسيط لأنواع الملفات الشائعة
            if uploaded_file.name.endswith(".mp4"): mime_type = "video/mp4"
            elif uploaded_file.name.endswith(".mp3"): mime_type = "audio/mp3"
            elif uploaded_file.name.endswith(".pdf"): mime_type = "application/pdf"

            # رفع الملف إلى Google AI
            myfile = genai.upload_file(tmp_path, mime_type=mime_type)
            
            # انتظار المعالجة
            import time
            while myfile.state.name == "PROCESSING":
                time.sleep(2)
                myfile = genai.get_file(myfile.name)

            # إعداد الموديل
            model = genai.GenerativeModel("gemini-1.5-flash")
            
            # الأمر (Prompt)
            prompt = """
            لخص هذا الملف التعليمي باللغة العربية:
            1. العنوان المقترح.
            2. شرح عام للفكرة.
            3. أهم النقاط المستفادة (Bullets).
            """

            # التلخيص
            response = model.generate_content([myfile, prompt])
            
            st.success("تم التلخيص!")
            st.markdown(response.text)

            # تنظيف
            os.unlink(tmp_path)

        except Exception as e:
            st.error(f"حدث خطأ: {e}")
