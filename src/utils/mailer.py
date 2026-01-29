import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
try:
    from src.db.system_config import get_config_value
except ImportError:
    from db.system_config import get_config_value

"""
   이메일 발송 관련 py 파일 
"""

class EmailSender:
    def __init__(self):
        self.config_name = 'gmail_config'
        
    # [1] _get_config: DB에서 이메일 설정을 가져옵니다.
    def _get_config(self):
        """Fetch email configuration from DB."""
        config = get_config_value(self.config_name)
        if not config:
            raise ValueError(f"System configuration '{self.config_name}' not found.")
        
        required_keys = ['mail.host', 'mail.port', 'mail.username', 'mail.password']
        for key in required_keys:
            if key not in config:
                raise ValueError(f"Missing required email config key: {key}")
                
        return config

    # [2] send_immediate: 즉시 이메일 발송을 합니다.
    def send_immediate(self, recipient: str, subject: str, content: str) -> tuple[bool, str | None]:
        """
        Send an email immediately using Gmail SMTP.
        Returns: (success: bool, error_msg: str | None)
        """
        try:
            config = self._get_config()
            
            smtp_host = config['mail.host']
            smtp_port = int(config['mail.port'])
            username = config['mail.username']
            password = config['mail.password']
            
            # 이메일 구성
            msg = MIMEMultipart()
            msg['From'] = username
            msg['To'] = recipient
            msg['Subject'] = subject
            
            # 이메일 본문 추가
            msg.attach(MIMEText(content, 'plain'))
            
            # 이메일 서버를 통해 이메일 전송
            server = smtplib.SMTP(smtp_host, smtp_port)
            server.starttls()
            server.login(username, password)
            text = msg.as_string()
            server.sendmail(username, recipient, text)
            server.quit()
                
            return True, None
            
        except Exception as e:
            return False, str(e)
