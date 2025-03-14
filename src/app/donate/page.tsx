"use client"

import { motion } from "framer-motion"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card"
import { Heart } from "lucide-react"

export default function Donate() {
  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-16 text-center"
      >
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent mb-6">
          Support Our Vision
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
          Your contribution helps us continue creating innovative art and media experiences
        </p>
      </motion.div>

      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Card className="backdrop-blur-lg bg-background/80 border border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                Make a Donation
              </CardTitle>
              <CardDescription>Choose an amount to support our artistic initiatives</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Select Amount</Label>
                <RadioGroup defaultValue="50" className="flex flex-wrap gap-4">
                  <div>
                    <RadioGroupItem value="25" id="amount-25" className="peer sr-only" />
                    <Label
                      htmlFor="amount-25"
                      className="flex cursor-pointer items-center justify-center rounded-3xl border-2 border-muted bg-popover px-6 py-2 text-center font-medium ring-offset-background peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary"
                    >
                      $25
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="50" id="amount-50" className="peer sr-only" />
                    <Label
                      htmlFor="amount-50"
                      className="flex cursor-pointer items-center justify-center rounded-3xl border-2 border-muted bg-popover px-6 py-2 text-center font-medium ring-offset-background peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary"
                    >
                      $50
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="100" id="amount-100" className="peer sr-only" />
                    <Label
                      htmlFor="amount-100"
                      className="flex cursor-pointer items-center justify-center rounded-3xl border-2 border-muted bg-popover px-6 py-2 text-center font-medium ring-offset-background peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary"
                    >
                      $100
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="custom" id="amount-custom" className="peer sr-only" />
                    <Label
                      htmlFor="amount-custom"
                      className="flex cursor-pointer items-center justify-center rounded-3xl border-2 border-muted bg-popover px-6 py-2 text-center font-medium ring-offset-background peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary"
                    >
                      Custom
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Your name" className="rounded-3xl" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="Your email address" className="rounded-3xl" />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full rounded-3xl">Complete Donation</Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

