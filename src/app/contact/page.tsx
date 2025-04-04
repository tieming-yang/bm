"use client"

import { motion } from "framer-motion"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card"
import { Mail, Phone, MapPin } from "lucide-react"

export default function Contact() {
  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-16 text-center"
      >
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent mb-6">
          聯繫我們
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
          如果您有任何問題或建議，請隨時聯繫我們。
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="space-y-8"
        >
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-medium">電子郵件</h3>
              <p className="text-muted-foreground">info@beyondmedia.com</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Phone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-medium">致電我們</h3>
              <p className="text-muted-foreground">+1 (555) 123-4567</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-medium">拜訪我們</h3>
              <p className="text-muted-foreground">123 Art Street, Creative District</p>
              <p className="text-muted-foreground">New York, NY 10001</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <Card className="backdrop-blur-lg bg-background/80 border border-primary/10">
            <CardHeader>
              <CardTitle>發送訊息</CardTitle>
              <CardDescription>填寫以下表單，我們將盡快與您聯繫。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">姓名</Label>
                <Input id="name" placeholder="您的姓名" className="rounded-3xl" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">電子郵件</Label>
                <Input id="email" type="email" placeholder="您的電子郵件地址" className="rounded-3xl" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">主題</Label>
                <Input id="subject" placeholder="這是關於什麼的？" className="rounded-3xl" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">訊息</Label>
                <Textarea id="message" placeholder="您的訊息..." className="min-h-[150px] rounded-3xl" />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full rounded-3xl">發送訊息</Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

