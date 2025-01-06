'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Icons } from "@/components/ui/icons"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { usePelagusWallet } from '@/lib/pelagus'
import { ethers } from 'ethers'

// ABI and contract address would typically be imported from a separate file
const CONTRACT_ABI = [{"inputs":[{"internalType":"enum RockPaperScissors.Choice","name":"_playerChoice","type":"uint8"}],"name":"play","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"MIN_BET","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"RECIPIENT","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"player","type":"address"},{"indexed":false,"internalType":"uint256","name":"bet","type":"uint256"},{"indexed":false,"internalType":"enum RockPaperScissors.Choice","name":"playerChoice","type":"uint8"},{"indexed":false,"internalType":"enum RockPaperScissors.Choice","name":"botChoice","type":"uint8"},{"indexed":false,"internalType":"enum RockPaperScissors.Result","name":"result","type":"uint8"}],"name":"GamePlayed","type":"event"}];
const CONTRACT_ADDRESS = "YOUR_CONTRACT_ADDRESS_HERE";

type Choice = 'rock' | 'paper' | 'scissors'
type Result = 'win' | 'lose' | 'draw'

const choices: Choice[] = ['rock', 'paper', 'scissors']

const WalletInfo = ({ account, onDisconnect }: { account: string; onDisconnect: () => void }) => (
  <div className="flex items-center justify-between bg-secondary p-2 rounded-md mb-4">
    <span className="text-sm font-medium truncate">
      Connected: {account.slice(0, 6)}...{account.slice(-4)}
    </span>
    <Button onClick={onDisconnect} variant="outline" size="sm">
      Disconnect
    </Button>
  </div>
)

export default function RockPaperScissors() {
  const { account, balance, connectWallet, disconnectWallet } = usePelagusWallet()
  const [playerChoice, setPlayerChoice] = useState<Choice | null>(null)
  const [botChoice, setBotChoice] = useState<Choice | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [score, setScore] = useState({ player: 0, bot: 0 })
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [gameState, setGameState] = useState<'idle' | 'choosing' | 'result'>('idle')
  const [bet, setBet] = useState('0.001')

  useEffect(() => {
    let timer: NodeJS.Timeout

    if (gameState === 'choosing' && timeLeft !== null) {
      if (timeLeft > 0) {
        timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      } else {
        setGameState('result')
        if (playerChoice) {
          playGame(playerChoice)
        }
      }
    }

    return () => clearTimeout(timer)
  }, [timeLeft, gameState, playerChoice])

  const playGame = async (choice: Choice) => {
    if (!account) return;

    const provider = new ethers.providers.Web3Provider(window.pelagus);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    try {
      const choiceIndex = choices.indexOf(choice);
      const tx = await contract.play(choiceIndex, { value: ethers.utils.parseEther(bet) });
      await tx.wait();

      // Listen for the GamePlayed event
      contract.on("GamePlayed", (player, betAmount, playerChoice, botChoice, result) => {
        if (player === account) {
          setBotChoice(choices[botChoice]);
          setResult(result === 0 ? 'win' : result === 1 ? 'lose' : 'draw');
          if (result === 0) {
            setScore(prev => ({ ...prev, player: prev.player + 1 }));
          } else if (result === 1) {
            setScore(prev => ({ ...prev, bot: prev.bot + 1 }));
          }
        }
      });
    } catch (error) {
      console.error("Error playing game:", error);
    }
  }

  const handleChoice = (choice: Choice) => {
    if (!account) {
      alert("Please connect your Pelagus wallet to play!")
      return
    }
    setPlayerChoice(choice)
    setTimeLeft(5)
    setGameState('choosing')
  }

  const resetGame = () => {
    setPlayerChoice(null)
    setBotChoice(null)
    setResult(null)
    setTimeLeft(null)
    setGameState('idle')
  }

  const handleBetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBet = e.target.value
    if (!isNaN(parseFloat(newBet)) && parseFloat(newBet) >= 0.001) {
      setBet(newBet)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-600 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Rock Paper Scissors</CardTitle>
          <CardDescription className="text-center">Play against the bot on Quai Network!</CardDescription>
        </CardHeader>
        <CardContent>
          {account ? (
            <>
              <WalletInfo account={account} onDisconnect={disconnectWallet} />
              <div className="flex justify-between mb-6">
                <div className="text-center">
                  <p className="font-semibold">You</p>
                  <p className="text-2xl font-bold">{score.player}</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold">Balance</p>
                  <p className="text-2xl font-bold">{balance ? ethers.utils.formatEther(balance) : '0'} QUAI</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold">Bot</p>
                  <p className="text-2xl font-bold">{score.bot}</p>
                </div>
              </div>
              <div className="mb-4">
                <Label htmlFor="bet">Bet amount (QUAI):</Label>
                <Input
                  id="bet"
                  type="number"
                  value={bet}
                  onChange={handleBetChange}
                  min={0.001}
                  step={0.001}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-center space-x-4 mb-6">
                {choices.map((choice) => (
                  <Button
                    key={choice}
                    onClick={() => handleChoice(choice)}
                    disabled={gameState !== 'idle'}
                    className={`w-20 h-20 rounded-full ${playerChoice === choice ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    {choice === 'rock' && <Icons.hand className="w-8 h-8" />}
                    {choice === 'paper' && <Icons.file className="w-8 h-8" />}
                    {choice === 'scissors' && <Icons.scissors className="w-8 h-8" />}
                  </Button>
                ))}
              </div>
              <AnimatePresence>
                {gameState === 'choosing' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="text-center"
                  >
                    <p className="text-xl font-semibold mb-2">Time left: {timeLeft} seconds</p>
                  </motion.div>
                )}
                {gameState === 'result' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="text-center"
                  >
                    <p className="text-xl font-semibold mb-2">
                      {result === 'win' && `You win ${parseFloat(bet) * 2} QUAI!`}
                      {result === 'lose' && `You lose ${bet} QUAI!`}
                      {result === 'draw' && "It's a draw! Your bet is returned."}
                    </p>
                    <p>
                      You chose {playerChoice}, bot chose {botChoice}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <div className="text-center">
              <p className="mb-4">Connect your Pelagus wallet to play!</p>
              <Button onClick={connectWallet}>Connect Wallet</Button>
            </div>
          )}
        </CardContent>
        <CardFooter>
          {account ? (
            <Button onClick={resetGame} className="w-full">
              Play Again
            </Button>
          ) : null}
        </CardFooter>
      </Card>
    </div>
  )
}

